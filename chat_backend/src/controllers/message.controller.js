import {pool} from '../lib/db.js';

export const getMessages = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.userId; // Changed from req.user.id to req.userId
    
    const query = `
      SELECT message_id, sender_id, receiver_id, message, sent_at, status
      FROM Messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY sent_at ASC
      LIMIT 100;
    `;
    
    const result = await client.query(query, [currentUserId, otherUserId]);
    
    const messages = result.rows.map(row => ({
      message_id: row.message_id,
      message: row.message,
      sender_id: row.sender_id,
      receiver_id: row.receiver_id,
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
    
    const query = `
    
      SELECT
        u.user_id AS friend_id,
        u.name AS friend_name,
        COALESCE(unread.unread_count, 0) AS unread_count,
        last_msg.message AS last_message,
        last_msg.sent_at AS last_message_timestamp
      FROM Users u
      LEFT JOIN (
        SELECT
          sender_id,
          COUNT(*) AS unread_count
        FROM Messages
        WHERE receiver_id = $1 AND status != 'read'
        GROUP BY sender_id
      ) AS unread ON unread.sender_id = u.user_id
      LEFT JOIN LATERAL (
        SELECT
          message,
          sent_at
        FROM Messages
        WHERE (sender_id = $1 AND receiver_id = u.user_id)
          OR (sender_id = u.user_id AND receiver_id = $1)
        ORDER BY sent_at DESC
        LIMIT 1
      ) AS last_msg ON true
      WHERE u.user_id != $1
        AND u.user_id IN (
          SELECT DISTINCT
            CASE
              WHEN sender_id = $1 THEN receiver_id
              ELSE sender_id
            END AS friend_id
          FROM Messages
          WHERE sender_id = $1 OR receiver_id = $1
        )
      ORDER BY last_msg.sent_at DESC;
    `;
    
    const result = await client.query(query, [currentUserId]);
    
    const chats = result.rows.map(row => ({
      friend_id: row.friend_id,
      friend_name: row.friend_name,
      unread_count: row.unread_count,
      last_message: row.last_message,
      last_message_time: row.last_message_timestamp
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
    try
    {
        const {message} = req.body;
        const {id:receiver_id} = req.params;
        const sender_id = req.userId;
        
        const result = await pool.query(
        `INSERT INTO Messages(sender_id,receiver_id,message) VALUES($1,$2,$3) 
        RETURNING 
          message_id,
          sender_id,
          receiver_id,
          message,
          sent_at,
          status;`
          ,[sender_id,receiver_id,message]);
        
        res.status(201).send(
        {
          success : true,
          new_message: result.rows[0]
        });
    }

    catch(error)
    {
        console.log("Error in message controller: ",error.message);
        res.status(500).json({error: "Internal Server Error"});
    } 

}
