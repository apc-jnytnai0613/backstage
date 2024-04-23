import {
    KubernetesClustersSupplier,
    ClusterDetails,
} from '@backstage/plugin-kubernetes-node'
import {
    KubernetesBuilder,
} from '@backstage/plugin-kubernetes-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { Duration } from 'luxon';
import { CatalogClient } from '@backstage/catalog-client';

export class CustomClustersSupplier implements KubernetesClustersSupplier {
    constructor(private clusterDetails: ClusterDetails[] = []) { }

    static create(refreshInterval: Duration) {
        const clusterSupplier = new CustomClustersSupplier();
        // setup refresh, e.g. using a copy of https://github.com/backstage/backstage/blob/master/plugins/kubernetes-backend/src/service/runPeriodically.ts
        runPeriodically(
            () => clusterSupplier.refreshClusters(),
            refreshInterval.toMillis(),
        );
        return clusterSupplier;
    }

    async refreshClusters(): Promise<void> {
        this.clusterDetails = []; // fetch from somewhere
    }

    async getClusters(): Promise<ClusterDetails[]> {
        return this.clusterDetails;
    }
}

export function runPeriodically(fn: () => any, delayMs: number): () => void {
    let cancel: () => void;
    let cancelled = false;
    const cancellationPromise = new Promise<void>(resolve => {
        cancel = () => {
            resolve();
            cancelled = true;
        };
    });

    const startRefresh = async () => {
        while (!cancelled) {
            try {
                await fn();
            } catch {
                // ignore intentionally
            }

            await Promise.race([
                new Promise(resolve => setTimeout(resolve, delayMs)),
                cancellationPromise,
            ]);
        }
    };
    startRefresh();

    return cancel!;
}

export default async function createPlugin(
    env: PluginEnvironment,
): Promise<Router> {

    const catalogApi = new CatalogClient({ discoveryApi: env.discovery });
    const builder = await KubernetesBuilder.createBuilder({
        logger: env.logger,
        config: env.config,
        catalogApi: catalogApi,
        discovery: env.discovery,
        permissions: env.permissions,
    });
    builder.setClusterSupplier(
        CustomClustersSupplier.create(Duration.fromObject({ minutes: 60 })),
    );
    const { router } = await builder.build();

    // ..
    return router;
}