# Travel Planning Backend API

A scalable, modular, and production-ready backend for a **Travel Planning & Travel Buddy Matching Platform**.

Built using **Node.js, Express.js, TypeScript, Prisma ORM, and PostgreSQL**, this API powers features like:

- Trip creation & management  
- Travel buddy matching  
- Participant join requests  
- Review system  
- User dashboards  
- SSLCommerz real subscription payments  
- Admin dashboards  



##  Features

### Authentication & Authorization
- Secure **JWT authentication**
- Password hashing using **bcrypt**
- **Cookie-based** session handling
- Role-based access (`user`, `admin`)



### Travel Plan Management
- Create, update, delete travel plans
- Public/Private visibility settings
- Date validation & budget range logic
- Participants can request to join trips
- Host can **accept / reject / cancel** requests
- Dynamic dashboard showing:
  - Hosted trips
  - Joined trips
  - Upcoming trips



### Travel Buddy Matching
Automatically matches travelers based on:

- Same destination  
- Overlapping dates  
- Same travel type  
- Public trip visibility  

Matches appear directly on the user dashboard.



### Review System
- Users can review hosts after completing trips  
- Prevent duplicate reviews  
- Admin can view & delete suspicious reviews  



### SSLCommerz Payment Integration
Supports real online subscription payments.

#### **Subscription Plans**
- Monthly Plan  
- Yearly Plan  
- Verified Badge Upgrade  

#### **Payment Features**
- SSLCommerz Sandbox integration  
- Success / fail / cancel redirect URLs  
- IPN validation endpoint  
- Auto-activate premium accounts after payment  
- User & Admin transaction history  




###  Admin Capabilities
- Manage all travel plans  
- Manage reviews  
- Manage transactions & subscriptions  
- Manage users  



## 🧰 Tech Stack

| Category      | Technology |
|--------------|------------|
| Runtime      | Node.js |
| Language     | TypeScript |
| Framework    | Express.js |
| Database     | PostgreSQL |
| ORM          | Prisma |
| Validation   | Zod |
| Auth         | JWT + Cookies |
| Payment      | SSLCommerz |
| Deployment   | Vercel / Render |


## API Endpoints


### **Authentication**
| Endpoint | Method | Description |
|---------|--------|-------------|
| `/api/auth/register` | POST | Register |
| `/api/auth/login` | POST | Login |
| `/api/auth/me` | GET | Logged-in user profile |

---

### **Travel Plans**
| Endpoint | Method | Description |
|---------|--------|-------------|
| `/api/travel-plans` | POST | Create plan |
| `/api/travel-plans/:id` | GET | Get plan |
| `/api/travel-plans/:id` | PATCH | Update plan |
| `/api/travel-plans/:id` | DELETE | Delete plan |
| `/api/travel-plans/:id/join` | POST | Request to join |
| `/api/travel-plans/:id/requests` | GET | Host: view join requests |
| `/api/travel-plans/hosted` | GET | Hosted plans |
| `/api/travel-plans/joined` | GET | Joined plans |

---

### **Reviews**
| Endpoint | Method | Description |
|---------|--------|-------------|
| `/api/reviews/user/:id` | GET | Get host reviews |
| `/api/reviews` | POST | Add review |
| `/api/admin/reviews` | GET | Admin: all reviews |
| `/api/admin/reviews/:id` | DELETE | Admin: delete |

---

### **Dashboard(User)**
| Endpoint | Method | Description |
|---------|--------|-------------|
| `/api/dashboard/user` | GET | Full dashboard: matches, hosted/joined trips |

---

### **Payments (SSLCommerz)**
| Endpoint | Method | Description |
|---------|--------|-------------|
| `/api/payments/init-subscription` | POST | Start payment |
| `/api/payments/success` | GET/POST | Success redirect |
| `/api/payments/fail` | GET/POST | Fail redirect |
| `/api/payments/cancel` | GET/POST | Cancel redirect |
| `/api/payments/validate-payment` | POST | IPN validation |
| `/api/payments/status/:transactionId` | GET | Frontend polling |
| `/api/payments/my-transactions` | GET | User payment history |
| `/api/payments/admin/transactions` | GET | Admin: all transactions |

---

## Setup Instructions

### Prerequisites

Before running the project, make sure you have:

- **Node.js v18+**
- **PostgreSQL Database** (Local, Docker, Railway, or NeonDB)
- **npm or yarn**
- **SSLCommerz Sandbox Credentials**
- **Prisma CLI installed globally (optional)**

```bash
npm install -g prisma
```

### 1️⃣ Clone & Install

```bash
git clone https://github.com/your-username/travel-planning-backend.git
cd travel-planning-backend
npm install
```

### 2️⃣ Setup Environment Variables:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

PORT=5000
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d
COOKIE_NAME=token
SALT_ROUNDS=12

# SSLCommerz Sandbox
SSL_STORE_ID=your_store_id
SSL_STORE_PASS=your_store_password
SSL_PAYMENT_API=https://sandbox.sslcommerz.com/gwprocess/v4/api.php
SSL_VALIDATION_API=https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php

# Backend redirect URLs
SSL_SUCCESS_BACKEND_URL=https://your-backend.com/api/payments/success
SSL_FAIL_BACKEND_URL=https://your-backend.com/api/payments/fail
SSL_CANCEL_BACKEND_URL=https://your-backend.com/api/payments/cancel
SSL_IPN_URL=https://your-backend.com/api/payments/validate-payment

# Frontend redirect URLs
SSL_SUCCESS_FRONTEND_URL=https://your-frontend.com/payment-success
SSL_FAIL_FRONTEND_URL=https://your-frontend.com/payment-fail
SSL_CANCEL_FRONTEND_URL=https://your-frontend.com/payment-cancel

# Pricing
PRICE_MONTHLY=299
PRICE_YEARLY=2999
PRICE_VERIFIED_BADGE=199

```

### 3️⃣ Run Prisma Migrations
```bash
npx prisma migrate dev
```
4️⃣ Start the Server
```bash
npm run dev
```

