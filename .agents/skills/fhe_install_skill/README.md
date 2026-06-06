# Fhenix Skill — Quickstart Template

This folder contains a ready-to-use Hardhat TypeScript template and example `ConfidentialVault` contract integrated with CoFHE.

Quick steps to use the template in a new project folder:

1. Copy the template files into your project root (package.json, tsconfig.json, hardhat.config.ts, `contracts/`, `scripts/`, `.env.example`).
2. Create a `.env` file from `.env.example` and fill `PRIVATE_KEY` and `SEPOLIA_RPC_URL`.
3. Install dependencies and compile:

```powershell
npm install
npx hardhat compile
```

4. Deploy to Sepolia (after funding your account):

```powershell
npx hardhat run scripts/deploy.ts --network sepolia
```

If you run into package install issues, install the dev dependencies one-by-one as documented in the skill.
