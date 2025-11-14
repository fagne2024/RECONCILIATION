import { Profil } from './profil.model';

export interface User {
    id?: number;
    username: string;
    password?: string;
    profil?: Profil;
    enabled2FA?: boolean;
    secret2FA?: string;
} 