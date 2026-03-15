# Firebase NoSQL Database Schema

Since Firebase Firestore is a NoSQL document database, standard relational ER diagrams don't perfectly represent how data is stored. However, we can establish **explicit relationships** between documents by storing reference IDs in the `transactions` schema.

Below is a **Mermaid Entity-Relationship (ER) Diagram** and a **JSON Structure** that demonstrate exactly how `transactions` are linked to `battles`, `deposits`, and `withdrawRequests` purely at the database schema level.

## Mermaid Diagram

You can paste this directly into a Notion Mermaid block:

```mermaid
erDiagram
    users ||--o{ battles : "creates or joins"
    users ||--o{ transactions : "has"
    users ||--o{ deposits : "makes"
    users ||--o{ withdrawRequests : "requests"
    
    transactions }o--o| battles : "linked to (optional)"
    transactions }o--o| deposits : "linked to (optional)"
    transactions }o--o| withdrawRequests : "linked to (optional)"

    users {
        string uid PK
        string phone "Phone number"
        string username "Unique username"
        number walletBalance "Current money in wallet"
        number totalWins
        number totalLosses
        number totalEarnings
        number winRate "(Wins / Total Games)"
        boolean isBlocked
        boolean isAdmin "Has admin dashboard access"
        string referralCode
        string referredBy "UID of referring user (optional)"
        string fcmToken "For Firebase Push Notifications"
        timestamp createdAt
    }

    battles {
        string id PK
        string creatorId FK "users.uid (initiator & room code setter)"
        string creatorName "users.username"
        string joinerId FK "users.uid (nullable)"
        string joinerName "users.username (nullable)"
        number entryFee "In rupees"
        number prizePool "In rupees"
        number platformFee "In rupees"
        string status "'open', 'running', 'completed', 'disputed', 'cancelled'"
        string roomCode "Ludo King Room Code"
        timestamp roomCodeSetAt
        timestamp roomJoinDeadline
        boolean joinerJoined
        string winnerId FK "users.uid"
        string creatorScreenshot "URL to Firebase Storage (Upload by creator)"
        string joinerScreenshot "URL to Firebase Storage (Upload by Joiner)"
        string creatorResult "'won', 'lost', null"
        string joinerResult "'won', 'lost', null"
        string result "'player1_wins', 'player2_wins', 'refund_both', null"
        boolean adminVerified
        timestamp startedAt
        timestamp completedAt
        timestamp createdAt
    }

    transactions {
        string id PK
        string uid FK "users.uid"
        string type "'credit', 'debit', 'deposit', 'withdraw'"
        number amount "In rupees"
        string description "Reason for transaction"
        string battleId FK "battles.id (if type is credit/debit for game)"
        string depositId FK "deposits.id (if type is deposit)"
        string withdrawReqId FK "withdrawRequests.id (if type is withdraw)"
        number balanceBefore 
        number balanceAfter
        timestamp timestamp
    }

    deposits {
        string id PK
        string uid FK "users.uid"
        number amount "In rupees"
        string referenceId "Payment Gateway ID or UTR"
        string status "'success', 'failed', 'pending'"
        timestamp createdAt
    }

    withdrawRequests {
        string id PK
        string uid FK "users.uid"
        number amount "In rupees (>= 200)"
        string upiId "User's UPI ID"
        string upiName "User's Name on UPI account"
        string status "'pending', 'approved', 'rejected'"
        string adminNote "Reason for rejection etc."
        timestamp resolvedAt
        timestamp createdAt
    }
```

---

## JSON Structure (Alternative Notion Format)

If you prefer a hierarchical text view, you can paste this into a standard Code block in Notion (set language to JSON or TypeScript):

```typescript
{
  "users": {
    "{uid}": { // Document
      "phone": "+919876543210",
      "username": "ludoking",
      "walletBalance": 500,
      "totalWins": 10,
      "totalLosses": 5,
      "totalEarnings": 1000,
      "winRate": 66.6,
      "isBlocked": false,
      "isAdmin": false,
      "referralCode": "ludoking45",
      "referredBy": "uid_of_another_user_or_null",
      "fcmToken": "firebase_push_token_or_null",
      "createdAt": "timestamp"
    }
  },

  "battles": {
    "{battleId}": { // Document
      "creatorId": "uid",
      "creatorName": "ludoking",
      "joinerId": "uid_or_null",
      "joinerName": "username_or_null",
      "entryFee": 50,
      "prizePool": 90,
      "platformFee": 10,
      "status": "open | running | completed | disputed | cancelled",
      "roomCode": "12345678",
      "roomCodeSetAt": "timestamp",
      "roomJoinDeadline": "timestamp",
      "joinerJoined": true,
      "winnerId": "uid_or_null",
      "creatorScreenshot": "url_or_null",
      "joinerScreenshot": "url_or_null",
      "creatorResult": "won | lost | null",
      "joinerResult": "won | lost | null",
      "result": "player1_wins | player2_wins | refund_both | null",
      "adminVerified": false,
      "startedAt": "timestamp",
      "completedAt": "timestamp",
      "createdAt": "timestamp"
    }
  },

  "deposits": {
    "{depositId}": { // Document
      "uid": "uid",
      "amount": 500,
      "referenceId": "pay_xyz123_or_utr", 
      "status": "success | failed | pending",
      "createdAt": "timestamp"
    }
  },

  "withdrawRequests": {
    "{requestId}": { // Document
      "uid": "uid",
      "amount": 250, // >= 200
      "upiId": "ludoking@upi",
      "upiName": "John Doe",
      "status": "pending | approved | rejected",
      "adminNote": "null_or_string",
      "resolvedAt": "timestamp_or_null",
      "createdAt": "timestamp"
    }
  },

  "transactions": {
    "{transactionId}": { // Document
      "uid": "uid",
      "type": "credit | debit | deposit | withdraw",
      "amount": 500,
      "description": "Won Battle #xyz123",
      
      // HOW IT LINKS: A transaction will contain ONE of these reference IDs
      "battleId": "battleId_or_null",      // Points to battles table
      "depositId": "depositId_or_null",    // Points to deposits table
      "withdrawReqId": "requestId_or_null",// Points to withdrawRequests table
      
      "balanceBefore": 0,
      "balanceAfter": 500,
      "timestamp": "timestamp"
    }
  }
}
```
