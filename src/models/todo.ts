export interface TodoSchema {
  _id?: { $oid: string };
  title: string;
  completed: boolean;
  createdAt: Date;
}
