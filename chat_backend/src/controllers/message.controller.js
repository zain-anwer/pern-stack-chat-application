import {pool} from '../lib/db.js';
import {io, getReceiverSocket} from '../lib/socket.js';

/*--------------------------------------- QUERIES --------------------------------------------------*/

const messages_query = `
      
      SELECT 
        Messages.message_id, 
        Messages.sender_id, 
        Messages.message, 
        Messages.sent_at, 
        Message_Status.status
      
      FROM Messages 
      JOIN Message_Status 
        ON Messages.message_id = Message_Status.message_id
  
      WHERE
        Messages.conversation_id = $2

        -- a little auth check (requesting person should be part of the convo and not a nosy lil...)

        AND EXISTS (SELECT * from Conversation_Members cm WHERE cm.member_id = $1 AND cm.conversation_id = $2)
  
      ORDER BY Messages.sent_at ASC
      LIMIT 100;
    `;

const chatlist_query = `
  
      SELECT 
        
        Conversations.conversation_id as conversation_id,
        Messages.message as last_message, 
        Messages.sent_at as last_message_time,
        is_group,

        -- COALESCE is a really cool function that returns the first NON NULL value in a list
        -- Ambiguously named but helpful nonetheless in deciding what the display name should be
        -- Conversations.name would be NULL in the event of the conversation not being a group

        COALESCE(Conversations.name,Users.name) as display_name, 

        -- receiver id for 1 - 1 chats
        
        CASE WHEN is_group = FALSE 
          THEN Conversation_Members.member_id 
          ELSE NULL END as other_user_id, 

        -- unread count 
        (SELECT COUNT(*) 
        FROM Message_Status 
        JOIN Messages m ON Message_Status.message_id = m.message_id
        WHERE m.conversation_id = Conversations.conversation_id
        AND Message_Status.receiver_id = $1
        AND Message_Status.status != 'read') as unread_count 

      FROM Conversations 
      JOIN Conversation_Members
        ON Conversations.conversation_id = Conversation_Members.conversation_id
      
      JOIN Messages
      -- getting only the last message rows from Messages table
        ON Messages.message_id = Conversations.last_message_id
    
      JOIN Users
      -- joining with Users so we we can friend name
        ON Conversation_Members.member_id = Users.user_id
      
        -- getting relevant conversations and filtering out the user
      WHERE Conversation_Members.conversation_id 
      IN 
        (SELECT conversation_id FROM Conversation_Members WHERE member_id = $1)
      AND Conversation_Members.member_id != $1

      -- handling duplicates in case of group chats :(
      
      ORDER BY
        Messages.sent_at DESC;
`;

// check whether conversation exists

const check_convo_exist = `SELECT * FROM Conversation_Members where member_id = $1
                          AND conversation_id IN 
                          (SELECT conversation_id FROM Conversation_Members where member_id = $2)
                          AND conversation_id IN
                          (SELECT conversation_id FROM Conversations where is_group = false);`
                                                    
// if the conversation exists

const message_insert = `INSERT INTO Messages(sender_id,conversation_id,message) VALUES($1,$2,$3)
                        RETURNING message_id, sender_id, message, sent_at;`
  
// if new chat/group is created (the three queries below will run as a transaction)

const convo_creation = `INSERT INTO Conversations(is_group,name) VALUES ($1,$2) RETURNING conversation_id;`
const message_insert_new_convo = `INSERT INTO Messages(sender_id,conversation_id,message) VALUES($1,$2,$3) 
                                  RETURNING message_id, sender_id, message, sent_at;`

const member_insert_new_convo_chat = `INSERT INTO Conversation_Members(conversation_id,member_id)
    VALUES($1,$2)
    -- adding a safety guard because the pair is a primary key and ion wanna deal with conflict (¬_¬)
    ON CONFLICT (conversation_id,member_id) DO NOTHING 
     ;`

const readall_query = ` UPDATE Message_Status
                        SET 
                          status = 'read',
                          read_at = CURRENT_TIMESTAMP
                        WHERE 
                          message_id IN (SELECT Messages.message_id
                                        FROM Messages 
                                        JOIN 
                                        Conversation_Members
                                        ON
                                          Messages.conversation_id = Conversation_Members.conversation_id
                                        WHERE
                                          Messages.sender_id != $1
                                          AND Conversation_Members.member_id = $1
                                          AND Conversation_Members.conversation_id = $2);
                      `

const get_convo_id = ` SELECT cm1.conversation_id FROM
                      Conversation_Members cm1 JOIN Conversation_Members cm2
                      ON cm1.conversation_id = cm2.conversation_id 
                      WHERE cm1.member_id = $1 AND cm2.member_id = $2;
                      
`

/* ------------------------------------------------------------------------------------------------- */

/* ----------------------------------- CONTROLLERS ------------------------------------------------- */

export const getAllContacts = async (req,res) =>
{   
  try{
    const currentUserId = req.userId
    const result = await pool.query("SELECT user_id, name from Users where user_id != $1;",[currentUserId])
    
    const contacts = result.rows.map(row => 
      (
        {
          user_id: row.user_id,
          name: row.name
        }
      )
    )
    
    res.status(200).json(
      {
        contacts,
        currentUserId
      }
    )

  }
  catch(error){
    console.log(error)
    res.status(500).json({message:"Failed to load contacts"})
  }
};

export const getMessages = async (req, res) => {
  
  const client = await pool.connect();
  
  console.log("In the message controller\n")
  
  try {
    const { conversation_id } = req.params;
    const currentUserId = req.userId; // Changed from req.user.id to req.userId
    let result;

    if (conversation_id)
    {
      result = await client.query(messages_query, [currentUserId, conversation_id]);
      await client.query(readall_query,[currentUserId,conversation_id]);
    }

    else
    {
      return res.status(200).json({
      messages: [],
      currentUserId
      });  
    }

    const messages = result.rows.map(row => ({
      message_id: row.message_id,
      sender_id: row.sender_id,
      message: row.message,
      sent_at: row.sent_at,
      status: row.status,
    }));
    
    // 200 OK – request successful, response contains result

    res.status(200).json({
      messages,
      currentUserId
    });
    
  } catch (error) {
    console.error('Error loading messages:', error);
    res.status(500).json({ message: 'Failed to load messages' });
  } finally {
    client.release();
  }
};

export const getChatList = async (req, res) => {
  
  const client = await pool.connect();
  
  try {
    const currentUserId = req.userId; // Changed from req.user.id to req.userId
    
    const result = await client.query(chatlist_query, [currentUserId]);
    
    const chats = result.rows.map(row => ({
      conversation_id: row.conversation_id,
      display_name: row.display_name,
      is_group: row.is_group,
      other_user_id: row.other_user_id,
      unread_count: row.unread_count,
      last_message: row.last_message,
      last_message_time: row.last_message_time
    }));
    
    res.status(200).json({ chats });
    
  } catch (error) {
    console.error('Error loading chat list:', error);
    res.status(500).json({ message: 'Failed to load chats' });
  } finally {
    client.release();
  }
};

export const sendMessage = async (req,res) => 
{
    console.log("In the send message controller\n");
    const client = await pool.connect();
    // send NULL if conversation doesn't exist
    try
    {
        const sender_id = req.userId;
        // 1 - 1 chats
        const {receiver_id} = req.params;
        // group_chats cause conversation_id will be created at group creation
        const {conversation_id} = req.params;
        const {message} = req.body;
        let message_insertion_result;

        if (receiver_id)
        {
          const result1 = await client.query(check_convo_exist,[sender_id,receiver_id]);

          /* conversation exists / old conversation */ 

          if (result1.rows.length != 0) 
          {
            // will bother with checks later
            const existing_convo_id = result1.rows[0].conversation_id;
            message_insertion_result = await client.query(message_insert,[sender_id,existing_convo_id,message]);
          }

          /* new conversation */

          else 
          {
            // defining a transaction for convo creation, member insertion, and message insertion
            await client.query("BEGIN;");
            const convo_creation_result = await client.query(convo_creation,[false,null]);
            const convo_id = convo_creation_result.rows[0].conversation_id;
            message_insertion_result = await client.query(message_insert_new_convo,[sender_id,convo_id,message]);
            await client.query(member_insert_new_convo_chat,[convo_id,receiver_id]);  
            await client.query(member_insert_new_convo_chat,[convo_id,sender_id]);
            await client.query("COMMIT;");
          }
        }

        else if (conversation_id)
        {
          const auth_check_result = await client.query("SELECT * from Conversation_Members WHERE member_id = $1 AND conversation_id = $2",[sender_id,conversation_id]);
          const isPartOfConvo = auth_check_result.rows.length;
          if (!isPartOfConvo)
          {
            console.log("User is not part of conversation\n");
            return res.status(401).json({message:"User not part of this conversation - User is a nosy creep"});
          }
          message_insertion_result = await client.query(message_insert,[sender_id,conversation_id,message]);
        }

        else 
          return res.status(400).json({message: 'Gimme the receiver_id/conversation_id idiot ¬_¬'})
        
        /* update socket functionality later */
        /* alot to deal with right now ¬_¬ */

        if (receiver_id)
        {

          const receiverSocket = getReceiverSocket(receiver_id)

          if (receiverSocket)
            io.to(receiverSocket).emit("getMessage",message_insertion_result.rows[0])
          else
            console.log("User Offline/Error in socket creation")
        }

        res.status(201).send(
        {
          success : true,
          new_message: message_insertion_result.rows[0]
        });
    }

    catch(error)
    {
        await client.query("ROLLBACK;");
        console.log("Error in message controller: ",error.message);
        res.status(500).json({error: "Internal Server Error"});
    } 
    finally
    {
      client.release();
    }

};

export const getConvoId = async (req,res) => {
  try
  {
    const {other_user_id} = req.params;
    const current_user_id = req.userId;

    if (other_user_id == current_user_id)
      return res.status(400).json({message: "Bad Request --- Identical Ids"});

    const result = await pool.query(get_convo_id,[other_user_id,current_user_id]);
    if (result.rows.length == 0)
    {
      return res.status(404).json({
        success: false,
        conversation_id: null
      })
    }
    else
    {
      return res.status(200).json({
        success: true,
        conversation_id: result.rows[0].conversation_id 
      })
    } 
  }
  catch(error){
    console.error('Error finding conversation id: ', error);
    res.status(500).json({ message: 'Failed to find conversation id' });
  }
}

/*
export const readAll = async (req,res) =>
{
    try
    {
        const userId = req.userId
        const {conversation_id} = req.params
        
        const result = await pool.query(readall_query,[userId,conversation_id])
        
        res.status(200).json({
            success: 'true',
            messages_read: result.rowCount
        })
    }

    catch(error)
    {
        console.log("Error in message controller: ",error.message);
        res.status(500).json({error: "Internal Server Error"});
    }
};
*/