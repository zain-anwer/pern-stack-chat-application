import {pool} from '../lib/db.js';
import {io, getReceiverSocket} from '../lib/socket.js';

/*--------------------------------------- QUERIES --------------------------------------------------*/

const messages_query = `
        SELECT * FROM (
          SELECT 
              Messages.message_id, 
              Messages.sender_id, 
              Messages.message, 
              Messages.sent_at, 
              COALESCE(status_summary.status, 'sent') AS status
          FROM Messages 
          LEFT JOIN LATERAL (
              SELECT CASE
                  WHEN BOOL_AND(status = 'read') THEN 'read'
                  WHEN BOOL_AND(status IN ('delivered', 'read')) THEN 'delivered'
                  WHEN BOOL_OR(status = 'delivered') THEN 'delivered'
                  ELSE 'sent'
              END AS status
              FROM Message_Status
              WHERE Message_Status.message_id = Messages.message_id
          ) status_summary ON TRUE
          WHERE
              Messages.conversation_id = $2
              AND EXISTS (
                  SELECT 1 FROM Conversation_Members cm 
                  WHERE cm.member_id = $1 AND cm.conversation_id = $2
              )
          ORDER BY Messages.sent_at DESC 
          LIMIT 100
      ) AS subquery_alias
      ORDER BY sent_at ASC;
    `;

const chatlist_query = `
      WITH chat_rows AS (
      SELECT
        Conversations.conversation_id,
        Messages.message AS last_message,
        Messages.sent_at AS last_message_time,
        Conversations.is_group,
        CASE
          WHEN Conversations.is_group
            THEN 'conversation:' || Conversations.conversation_id::text
          ELSE 'contact:' || other_member.user_id::text
        END AS dedupe_key,

        CASE
          WHEN Conversations.is_group THEN Conversations.name
          ELSE other_member.name
        END AS display_name,

        -- receiver id for 1 - 1 chats
        
        CASE
          WHEN Conversations.is_group THEN NULL
          ELSE other_member.user_id
        END AS other_user_id,

        CASE
          WHEN Conversations.is_group THEN NULL
          ELSE other_member.profile_picture
        END AS profile_picture,

        -- unread count 
        (SELECT COUNT(*) 
        FROM Message_Status
        JOIN Messages unread_messages ON Message_Status.message_id = unread_messages.message_id
        WHERE unread_messages.conversation_id = Conversations.conversation_id
        AND Message_Status.receiver_id = $1
        AND Message_Status.status != 'read') AS unread_count

      FROM Conversations
      JOIN Messages ON Messages.message_id = Conversations.last_message_id
      LEFT JOIN LATERAL (
        SELECT Users.user_id, Users.name, Users.profile_picture
        FROM Conversation_Members
        JOIN Users ON Users.user_id = Conversation_Members.member_id
        WHERE Conversation_Members.conversation_id = Conversations.conversation_id
          AND Conversation_Members.member_id != $1
        ORDER BY Conversation_Members.member_id
        LIMIT 1
      ) other_member ON TRUE
      WHERE EXISTS (
        SELECT 1
        FROM Conversation_Members
        WHERE Conversation_Members.conversation_id = Conversations.conversation_id
          AND Conversation_Members.member_id = $1
      )
      ),
      ranked_chats AS (
        SELECT
          chat_rows.*,
          ROW_NUMBER() OVER (
            PARTITION BY dedupe_key
            ORDER BY last_message_time DESC, conversation_id DESC
          ) AS chat_rank
        FROM chat_rows
      )
      SELECT
        conversation_id,
        last_message,
        last_message_time,
        is_group,
        display_name,
        other_user_id,
        profile_picture,
        unread_count
      FROM ranked_chats
      WHERE chat_rank = 1
      ORDER BY last_message_time DESC;
`;

// check whether conversation exists

const check_convo_exist = `SELECT Conversation_Members.conversation_id FROM Conversation_Members
                          JOIN Conversations USING (conversation_id)
                          WHERE Conversation_Members.member_id = $1
                          AND conversation_id IN
                            (SELECT conversation_id FROM Conversation_Members WHERE member_id = $2)
                          AND Conversations.is_group = false
                          ORDER BY conversation_id DESC
                          LIMIT 1;`
                                                    
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

const readall_query = `
  UPDATE Message_Status
  SET status = 'read', read_at = CURRENT_TIMESTAMP
  FROM Messages
  WHERE Message_Status.message_id = Messages.message_id
    AND Message_Status.receiver_id = $1
    AND Message_Status.status != 'read'
    AND Messages.sender_id != $1
    AND Messages.conversation_id = $2
  RETURNING Message_Status.message_id, Messages.sender_id;
`

const get_convo_id = ` SELECT cm1.conversation_id FROM
                      Conversation_Members cm1 JOIN Conversation_Members cm2
                      ON cm1.conversation_id = cm2.conversation_id 
                      WHERE cm1.member_id = $1 AND cm2.member_id = $2
                      AND cm1.conversation_id IN
                        (SELECT conversation_id FROM Conversations WHERE is_group = false)
                      ORDER BY cm1.conversation_id DESC
                      LIMIT 1;
                      
`

/* ------------------------------------------------------------------------------------------------- */

/* ----------------------------------- CONTROLLERS ------------------------------------------------- */

export const getAllContacts = async (req,res) =>
{   
  try{
    const currentUserId = req.userId
    const result = await pool.query(
      "SELECT user_id, name, profile_picture FROM Users WHERE user_id != $1;",
      [currentUserId]
    )
    
    const contacts = result.rows.map(row => 
      (
        {
          user_id: row.user_id,
          name: row.name,
          profile_picture: row.profile_picture
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
      const readResult = await client.query(readall_query,[currentUserId,conversation_id]);
      const messageIdsBySender = new Map();
      for (const row of readResult.rows) {
        const senderId = String(row.sender_id);
        const messageIds = messageIdsBySender.get(senderId) ?? [];
        messageIds.push(row.message_id);
        messageIdsBySender.set(senderId, messageIds);
      }
      if (readResult.rows.length > 0) {
        const updatedStatuses = await client.query(
          `SELECT message_id,
             CASE
               WHEN BOOL_AND(status = 'read') THEN 'read'
               WHEN BOOL_AND(status IN ('delivered', 'read')) THEN 'delivered'
               WHEN BOOL_OR(status = 'delivered') THEN 'delivered'
               ELSE 'sent'
             END AS status
           FROM Message_Status
           WHERE message_id = ANY($1::bigint[])
           GROUP BY message_id;`,
          [readResult.rows.map(row => row.message_id)]
        );
        const statusesByMessage = new Map(
          updatedStatuses.rows.map(row => [String(row.message_id), row.status])
        );

        for (const [senderId, messageIds] of messageIdsBySender) {
          const senderSocket = getReceiverSocket(senderId);
          if (senderSocket) {
            io.to(senderSocket).emit("readMessages",{
              conversation_id,
              readBy: currentUserId,
              message_statuses: messageIds.map(messageId => ({
                message_id: messageId,
                status: statusesByMessage.get(String(messageId))
              }))
            });
          }
        }
      }
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
      profile_picture: row.profile_picture,
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
    const client = await pool.connect();
    let transactionStarted = false;
    try
    {
        const sender_id = req.userId;
        const {receiver_id} = req.params;
        const {conversation_id} = req.params;
        const {message} = req.body;
        let convo_id;
        let message_insertion_result;

        if (!message || (!receiver_id && !conversation_id)) {
          return res.status(400).json({message: "A message and chat recipient are required"});
        }

        await client.query("BEGIN");
        transactionStarted = true;

        if (receiver_id)
        {
          const lockIds = [String(sender_id), String(receiver_id)].sort();
          await client.query(
            "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2));",
            lockIds
          );
          const result1 = await client.query(check_convo_exist,[sender_id,receiver_id]);

          if (result1.rows.length !== 0) {
            convo_id = result1.rows[0].conversation_id;
            message_insertion_result = await client.query(message_insert,[sender_id,convo_id,message]);
          }
          else {
            const convo_creation_result = await client.query(convo_creation,[false,null]);
            convo_id = convo_creation_result.rows[0].conversation_id;
            await client.query(member_insert_new_convo_chat,[convo_id,receiver_id]);  
            await client.query(member_insert_new_convo_chat,[convo_id,sender_id]);
            message_insertion_result = await client.query(message_insert_new_convo,[sender_id,convo_id,message]);
          }
        }
        else if (conversation_id)
        {
          const auth_check_result = await client.query(
            "SELECT 1 FROM Conversation_Members WHERE member_id = $1 AND conversation_id = $2",
            [sender_id,conversation_id]
          );
          if (auth_check_result.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;
            return res.status(401).json({message:"User not part of this conversation - User is a nosy creep"});
          }
          message_insertion_result = await client.query(message_insert,[sender_id,conversation_id,message]);
          convo_id = conversation_id;
        }

        const newMessage = {
          ...message_insertion_result.rows[0],
          conversation_id: convo_id
        };
        const receiver_ids = await client.query(
          "SELECT member_id FROM Conversation_Members WHERE conversation_id = $1;",
          [convo_id]
        );
        const receiverRooms = [];

        for (const id of receiver_ids.rows)
        {
          if (String(id.member_id) === String(sender_id)) continue;

          const receiverSocket = getReceiverSocket(id.member_id)
          if (receiverSocket)
          {
            await client.query(
              "UPDATE Message_Status SET status = 'delivered', delivered_at = NOW() WHERE receiver_id = $1 AND message_id = $2 AND status = 'sent';",
              [id.member_id,newMessage.message_id]
            );
            receiverRooms.push(receiverSocket);
          }
        }

        const aggregateStatus = await client.query(
          `SELECT CASE
             WHEN BOOL_AND(status = 'read') THEN 'read'
             WHEN BOOL_AND(status IN ('delivered', 'read')) THEN 'delivered'
             WHEN BOOL_OR(status = 'delivered') THEN 'delivered'
             ELSE 'sent'
           END AS status
           FROM Message_Status
           WHERE message_id = $1;`,
          [newMessage.message_id]
        );
        const status = aggregateStatus.rows[0].status;

        await client.query("COMMIT");
        transactionStarted = false;

        receiverRooms.forEach(receiverRoom => {
          io.to(receiverRoom).emit("getMessage",newMessage);
        });

        const senderSocket = getReceiverSocket(sender_id);
        if (senderSocket) {
          io.to(senderSocket).emit("messageDelivered", {
            message_id: newMessage.message_id,
            conversation_id: convo_id,
            status
          });
        }
        res.status(201).json({
          success: true,
          new_message: {...newMessage, status}
        });
    }
    catch(error)
    {
        if (transactionStarted) {
          await client.query("ROLLBACK");
        }
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

export const readMessage = async (req,res) => {
  
  try{
    const { message_id } = req.params
    const receiver_id = req.userId

    const result = await pool.query(
      "UPDATE Message_Status SET status = 'read', read_at = CURRENT_TIMESTAMP WHERE message_id = $1 AND receiver_id = $2 AND status != 'read' RETURNING *;",
      [message_id,receiver_id]
    );

    if (result.rowCount === 0) {
      const existingStatus = await pool.query(
        "SELECT 1 FROM Message_Status WHERE message_id = $1 AND receiver_id = $2",
        [message_id,receiver_id]
      );
      if (existingStatus.rowCount === 0) {
        return res.status(404).json({message: "Message status not found"});
      }
      return res.status(200).json({ success: true, result });
    }

    const sender = await pool.query(
      "SELECT sender_id, conversation_id FROM Messages WHERE message_id = $1",
      [message_id]
    );
    const aggregateStatus = await pool.query(
      `SELECT CASE
         WHEN BOOL_AND(status = 'read') THEN 'read'
         WHEN BOOL_AND(status IN ('delivered', 'read')) THEN 'delivered'
         WHEN BOOL_OR(status = 'delivered') THEN 'delivered'
         ELSE 'sent'
       END AS status
       FROM Message_Status
       WHERE message_id = $1;`,
      [message_id]
    );
    const sender_socket = getReceiverSocket(sender.rows[0].sender_id);
    if (sender_socket) {
      io.to(sender_socket).emit("readSingleMessage",{
        message_id,
        conversation_id: sender.rows[0].conversation_id,
        readBy: receiver_id,
        status: aggregateStatus.rows[0].status
      });
    }
    
    return res.status(200).json({
      success: true,
      result
    })
  } 
  catch(error)
  {
    console.log('Error reading message: ', error)
    return res.status(500).json({message: 'Error update message status to read'});
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