/**
 * Cloisonnement réconciliation magique : priorité absolue au tag _magicService.
 * Ne pas utiliser TRANS TYPE / Service pour le partitionnement lorsque les tags magiques existent.
 */

export function getMagicPartitionServiceTag(record: Record<string, string>): string {
    return String(record['_magicService'] || '').trim();
}

export function getMagicPartitionPartnerFileTag(record: Record<string, string>): string {
    return String(record['_magicPartnerFile'] || '').trim();
}

export function hasMagicPartitionTags(records: Record<string, string>[]): boolean {
    return records.some(r => !!getMagicPartitionServiceTag(r) || !!getMagicPartitionPartnerFileTag(r));
}

export function servicesMatchPartition(a: string, b: string): boolean {
    if (!a || !b) {
        return a === b;
    }
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function recordMatchesMagicPartition(
    record: Record<string, string>,
    service: string,
    partnerFile: string,
    magicTaggedDataset: boolean
): boolean {
    const serviceFilter = (service || '').trim();
    const partnerFileFilter = (partnerFile || '').trim();

    if (partnerFileFilter) {
        const partnerTag = getMagicPartitionPartnerFileTag(record);
        if (partnerTag && !servicesMatchPartition(partnerTag, partnerFileFilter)) {
            return false;
        }
    }

    if (!serviceFilter) {
        return true;
    }

    const magicServiceTag = getMagicPartitionServiceTag(record);
    if (magicServiceTag) {
        return servicesMatchPartition(magicServiceTag, serviceFilter);
    }

    if (magicTaggedDataset) {
        return false;
    }

    const fallback = String(
        record['Service'] ||
        record['service'] ||
        record['SERV'] ||
        ''
    ).trim();
    return servicesMatchPartition(fallback, serviceFilter);
}

export function filterRecordsByMagicPartition(
    records: Record<string, string>[],
    service: string,
    partnerFile: string
): Record<string, string>[] {
    if (!service && !partnerFile) {
        return records;
    }
    const magicTaggedDataset = hasMagicPartitionTags(records);
    return records.filter(record =>
        recordMatchesMagicPartition(record, service, partnerFile, magicTaggedDataset)
    );
}
