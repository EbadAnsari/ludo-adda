# Firebase NoSQL Database Schema

Since Firebase Firestore is a NoSQL document database, standard relational ER diagrams don't perfectly represent how data is stored. However, we can establish **explicit relationships** between documents by storing reference IDs in the `transactions` schema.

Below is a **Mermaid Class Diagram** and a **JSON Structure** that demonstrate exactly how `transactions` are linked to `battles`, `deposits`, and `withdrawRequests` purely at the database schema level.

## Mermaid Diagram

You can paste this directly into a Notion Mermaid block:

```mermaid
classDiagram
    %% Collections
    class Users {
        <<Collection>>
        Path: /users/{uid}
    }
    class Battles {
        <<Collection>>
        Path: /battles/{battleId}
    }
    class Transactions {
        <<Collection>>
        Path: /transactions/{transactionId}
    }
    class Deposits {
        <<Collection>>
        Path: /deposits/{depositId}
    }
    class WithdrawRequests {
        <<Collection>>
        Path: /withdrawRequests/{requestId}
    }

    %% Document Schemas
    class UserDocument {
        <<Document>>
        string phone
        string username
        number walletBalance
        number totalWins
        number totalLosses
        number totalEarnings
        number winRate
        boolean isBlocked
        boolean isAdmin
        string referralCode
        string referredBy
        string fcmToken
        timestamp createdAt
    }

    class BattleDocument {
        <<Document>>
        string creatorId
        string creatorName
        string joinerId
        string joinerName
        number entryFee
        number prizePool
        number platformFee
        string status "open, running, completed, disputed, cancelled"
        string roomCode
        timestamp roomCodeSetAt
        timestamp roomJoinDeadline
        boolean joinerJoined
        string winnerId
        string creatorScreenshot
        string joinerScreenshot
        string creatorResult "won, lost, null"
        string joinerResult "won, lost, null"
        string result "player1_wins, player2_wins, refund_both, null"
        boolean adminVerified
        timestamp startedAt
        timestamp completedAt
        timestamp createdAt
    }

    class TransactionDocument {
        <<Document>>
        string uid FK "users.uid"
        string type "credit, debit, deposit, withdraw"
        number amount
        string description
        string battleId "FK -> Battles (if type is credit/debit for game)"
        string depositId "FK -> Deposits (if type is deposit)"
        string withdrawReqId "FK -> WithdrawRequests (if type is withdraw)"
        number balanceBefore
        number balanceAfter
        timestamp timestamp
    }

    class DepositDocument {
        <<Document>>
        string uid FK "users.uid"
        number amount
        string referenceId "Payment Gateway ID or UTR"
        string status "success, failed, pending"
        timestamp createdAt
    }

    class WithdrawRequestDocument {
        <<Document>>
        string uid FK "users.uid"
        number amount "Must be >= 200"
        string upiId
        string upiName
        string status "pending, approved, rejected"
        string adminNote
        timestamp resolvedAt
        timestamp createdAt
    }

    %% Database Level Linkages
    Users *-- UserDocument : contains
    Battles *-- BattleDocument : contains
    Transactions *-- TransactionDocument : contains
    Deposits *-- DepositDocument : contains
    WithdrawRequests *-- WithdrawRequestDocument : contains

    %% Explicit Foreign Key Associations in Schema
    TransactionDocument --> BattleDocument : "Linked via battleId"
    TransactionDocument --> DepositDocument : "Linked via depositId"
    TransactionDocument --> WithdrawRequestDocument : "Linked via withdrawReqId"
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
