type UserRecord = {
  userId: string;
  name: string;
  email: string;
};

const users: UserRecord[] = [
  {
    userId: "USR-001",
    name: "Rudo Moyo",
    email: "rudo.moyo@omari.co.zw",
  },
  {
    userId: "USR-002",
    name: "Tawanda Chikore",
    email: "tawanda.chikore@omari.co.zw",
  },
  {
    userId: "USR-003",
    name: "Nyasha Sibanda",
    email: "nyasha.sibanda@omari.co.zw",
  },
  {
    userId: "USR-004",
    name: "Tanaka Dube",
    email: "tanaka.dube@omari.co.zw",
  },
  {
    userId: "USR-005",
    name: "Faith Ncube",
    email: "faith.ncube@omari.co.zw",
  },
  {
    userId: "USR-006",
    name: "Kundai Mpofu",
    email: "kundai.mpofu@omari.co.zw",
  },
];

export const getUsersData = () => users;
