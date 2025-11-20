export interface ServiceReference {
    id?: number;
    pays: string;
    codeService: string;
    serviceLabel: string;
    codeReco: string;
    serviceType?: string;
    operateur?: string;
    reseau?: string;
    reconciliable: boolean;
    motif?: string;
    retenuOperateur?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type ServiceReferencePayload = Omit<ServiceReference, 'id' | 'createdAt' | 'updatedAt'>;

export interface ServiceReferenceDashboard {
    country: string;
    trxReconBrut: number;
    trxReconNet: number;
    totalVolume: number;
    totalTransactions: number;
    reconcilableVolume?: number;
    reconcilableTransactions?: number;
    nonReconcilableVolume?: number;
    nonReconcilableTransactions?: number;
}
