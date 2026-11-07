# ER diagram

GitHub draws this diagram automatically. For a picture to submit, paste it into [mermaid.live](https://mermaid.live) and export a PNG.

```mermaid
erDiagram
    USER ||--o{ ADDRESS : owns
    USER ||--o{ SHIPMENT : "books (customer)"
    USER ||--o{ SHIPMENT : "creates (createdBy)"
    USER |o--o{ SHIPMENT : "currently delivers (assignedAgent)"
    USER ||--o{ ASSIGNMENT : "is assigned (agent)"
    USER ||--o{ ASSIGNMENT : "assigns (assignedBy)"
    USER ||--o{ DELIVERY_ATTEMPT : "makes (agent)"
    USER ||--o{ TRACKING_EVENT : records
    ADDRESS ||--o{ SHIPMENT : "sends from"
    ADDRESS ||--o{ SHIPMENT : "delivers to"
    SHIPMENT ||--|{ TRACKING_EVENT : has
    SHIPMENT ||--o{ ASSIGNMENT : has
    SHIPMENT ||--o{ DELIVERY_ATTEMPT : has
    ASSIGNMENT ||--o{ DELIVERY_ATTEMPT : covers
    DELIVERY_ATTEMPT ||--|| TRACKING_EVENT : creates

    USER {
        ObjectId _id PK
        string name
        string email UK
        string phone
        string password "bcrypt hash, never returned"
        enum role "admin, staff, agent, customer"
        string branch
        boolean isActive
    }

    ADDRESS {
        ObjectId _id PK
        ObjectId owner FK
        string label
        string contactName
        string phone
        string line1
        string line2
        string city
        string state
        string postalCode
        string country
    }

    SHIPMENT {
        ObjectId _id PK
        string trackingNumber UK
        ObjectId customer FK
        ObjectId senderAddress FK
        ObjectId receiverAddress FK
        string description
        number weightKg
        enum serviceType "standard, express, overnight"
        enum status "created to delivered, returned, cancelled"
        string originBranch
        string currentLocation
        ObjectId assignedAgent FK
        date expectedDeliveryDate
        date deliveredAt
        ObjectId createdBy FK
    }

    TRACKING_EVENT {
        ObjectId _id PK
        ObjectId shipment FK
        enum status
        string location "public"
        string description "public"
        string note "signed-in users only"
        ObjectId attempt FK
        ObjectId recordedBy FK
        date occurredAt
    }

    ASSIGNMENT {
        ObjectId _id PK
        ObjectId shipment FK
        ObjectId agent FK
        ObjectId assignedBy FK
        enum status "active, completed, cancelled"
        string note
        date assignedAt
        date closedAt
    }

    DELIVERY_ATTEMPT {
        ObjectId _id PK
        ObjectId shipment FK
        ObjectId assignment FK
        ObjectId agent FK
        number attemptNumber
        enum outcome "delivered, failed"
        enum failureReason
        string receivedBy
        string location
        string note
        date attemptedAt
    }
```

## Indexes

| Collection | Index | Purpose |
|---|---|---|
| users | `email` (unique) | Login, no duplicate accounts |
| users | `role, isActive, name` | User lists and agent pickers |
| addresses | `owner, createdAt` | A customer's address book |
| addresses | `city, postalCode` | City filter |
| shipments | `trackingNumber` (unique) | Public tracking |
| shipments | `customer, createdAt` | A customer's shipments |
| shipments | `assignedAgent, status` | An agent's deliveries |
| shipments | `status, createdAt` | Status filter and reports |
| shipments | `deliveredAt` | Daily delivered report |
| trackingevents | `shipment, occurredAt` | A shipment's history |
| trackingevents | `status, occurredAt` | Event list filter |
| assignments | `shipment` (unique where status is active) | Only one active agent per shipment |
| assignments | `shipment, assignedAt` | A shipment's assignment history |
| assignments | `agent, status, assignedAt` | An agent's assignments |
| deliveryattempts | `shipment, attemptNumber` (unique) | Attempt numbering |
| deliveryattempts | `agent, attemptedAt` | Agent history and reports |
| deliveryattempts | `outcome, attemptedAt` | Outcome filter and reports |

## Shipment status flow

```mermaid
stateDiagram-v2
    [*] --> created
    created --> picked_up
    created --> cancelled
    picked_up --> in_transit
    picked_up --> cancelled
    in_transit --> in_transit: next hub
    in_transit --> out_for_delivery
    in_transit --> returned
    out_for_delivery --> in_transit
    out_for_delivery --> delivered: attempt succeeded
    out_for_delivery --> failed_attempt: attempt failed
    failed_attempt --> out_for_delivery
    failed_attempt --> in_transit
    failed_attempt --> returned
    delivered --> [*]
    returned --> [*]
    cancelled --> [*]
```
