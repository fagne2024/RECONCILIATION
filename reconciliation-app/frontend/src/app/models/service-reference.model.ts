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

/** Réponse POST /api/service-references/delete-batch (alignée sur DeleteOperationsResponse backend). */
export interface ServiceReferenceBatchDeleteResult {
    success: boolean;
    deletedCount: number;
    errors: string[];
}

/** Réponse POST /api/service-references/import-batch */
export interface ServiceReferenceImportBatchResult {
    successCount: number;
    errors: string[];
}

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
