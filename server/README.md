# Ethereum Wallet Backend

Node.js + TypeScript backend for Ethereum wallet authentication and transaction handling.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Configure environment variables:
Create a `.env` file in the server directory:
```
PORT=3000
INFURA_PROJECT_ID=your_infura_project_id
NETWORK=goerli
```

3. Build and run:
```bash
npm run build
npm start
```

Or for development:
```bash
npm run dev
```

## API Endpoints

### Authentication

- `GET /api/nonce` - Generate a nonce for wallet authentication
- `POST /api/verify` - Verify a signed message

### Transactions

- `POST /api/createTx` - Create a transaction object
- `POST /api/broadcast` - Broadcast a signed transaction
- `GET /api/tx/:hash` - Get transaction details

## Usage

The backend provides cryptographic utilities for:
- Generating nonces for secure login
- Verifying Ethereum message signatures
- Broadcasting signed transactions to the network
- Querying transaction status
