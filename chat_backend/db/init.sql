-- implemented yet [no]

-- currently the application only implements 1-1 chats but this schema can support group chats as well
-- it might seem deranged that there is a separate message status table but its important for later group chat extension
-- also a bigger schema looks complex hence cool no?
-- we will keep the primary keys BIGSERIAL because it autoincrements

CREATE TABLE Users (
    user_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_picture TEXT DEFAULT '/data/profileImages/default.jpg',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

--  used for group chats 

CREATE TABLE Conversations (
    conversation_id BIGSERIAL PRIMARY KEY,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    name TEXT,
    CHECK ((is_group = false AND name IS NULL)
    OR (is_group = true AND name IS NOT NULL),
    last_message_id BIGINT
));

CREATE TABLE Messages (
    message_id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    conversation_id BIGINT NOT NULL REFERENCES Conversations(conversation_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE Conversations
    ADD CONSTRAINT fk_last_message
    FOREIGN KEY (last_message_id) REFERENCES Messages(message_id) ON DELETE SET NULL;

CREATE TABLE Message_Status (
    message_id BIGINT NOT NULL REFERENCES Messages(message_id) ON DELETE CASCADE,
    receiver_id BIGINT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent','delivered','read')),
    PRIMARY KEY(message_id,receiver_id),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);

-- used to get group chat members

CREATE TABLE Conversation_Members (
   conversation_id BIGINT NOT NULL REFERENCES Conversations(conversation_id) ON DELETE CASCADE,
   member_id BIGINT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
   PRIMARY KEY (conversation_id, member_id)
);

-- trigger to get the updated timestamp

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON Users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- trigger to update last message id stored in conversation table

CREATE OR REPLACE FUNCTION update_last_message_id()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Conversations
    SET last_message_id = NEW.message_id
    WHERE conversation_id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_last_message_id_updated
AFTER INSERT ON Messages
FOR EACH ROW EXECUTE FUNCTION update_last_message_id();

-- we will be creating indexes based on search queries

CREATE INDEX idx_messages_conversation_sent ON Messages(conversation_id, sent_at DESC);
CREATE INDEX idx_conversation_members_member ON Conversation_Members(member_id);
CREATE INDEX idx_message_status_message ON Message_Status(message_id);