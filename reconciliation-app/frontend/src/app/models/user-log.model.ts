export interface UserLog {
  id?: number;
  permission: string;
  module: string;
  username: string;
  dateHeure: string;
  createdAt?: string;
}

export interface UserLogFilter {
  username?: string;
  module?: string;
  permission?: string;
  dateDebut?: string;
  dateFin?: string;
}

