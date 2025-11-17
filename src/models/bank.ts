export interface BankSchema {
  _id?: { $oid: string };
  id: string; // Generated bank ID (e.g., BNK001ABC)
  accountHolderName: string;
  bankName: string;
  branchAddress: string;
  accountNumber: string;
  ifscCode: string;
  createdAt: Date;
  updatedAt: Date;
}
