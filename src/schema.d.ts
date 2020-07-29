declare interface Button {
  ID: string;
  Name: string;
  IsDuration: boolean;
  UseMemo: boolean;
  For: string;
}

declare interface Baby {
  ID: string;
  Name: string;
}

declare interface Happen {
  ID: string | undefined;
  Baby: string;
  Label: string;
  Memo: string;
  Start: Date;
  End: Date | '-';
}
