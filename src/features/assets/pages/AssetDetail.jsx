import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../api/assets.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

export default function AssetDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const api = useMemo(() => makeAssetsApi(http), [http]);

  const { data: asset } = useQuery({
    queryKey: ['assets.fixedAsset', id],
    queryFn: async () => api.getFixedAsset(id),
    enabled: !!id
  });

  async function onDeleteDraft() {
    if (!asset) return;
    // Only backend allows DELETE for draft assets.
    await api.deleteFixedAsset(id);
    await qc.invalidateQueries({ queryKey: ['assets.fixedAssets'] });
    nav(-1);
  }

  if (!asset) return null;

  return (
    <>
      <PageHeader
        title={asset.name ?? 'Fixed Asset'}
        subtitle={asset.code ? `Code: ${asset.code}` : 'Fixed asset'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => nav(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {asset.status === 'draft' ? (
              <Button variant="danger" onClick={onDeleteDraft}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete draft
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ContentCard className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge>{asset.status ?? 'draft'}</Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Acquisition date</div>
              <div className="font-medium">{asset.acquisitionDate ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Cost</div>
              <div className="font-medium">{asset.cost ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Salvage value</div>
              <div className="font-medium">{asset.salvageValue ?? '—'}</div>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <div className="text-sm font-semibold mb-2">Actions</div>
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={() => nav(ROUTES.assetsAssetAcquire(id))}>
              Acquire <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={() => nav(ROUTES.assetsAssetTransfer(id))} variant="secondary">
              Transfer <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={() => nav(ROUTES.assetsAssetRevalue(id))} variant="secondary">
              Revalue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={() => nav(ROUTES.assetsAssetImpair(id))} variant="secondary">
              Impair <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={() => nav(ROUTES.assetsAssetDispose(id))} variant="secondary">
              Dispose <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="border-t my-2" />

            <Button onClick={() => nav(ROUTES.assetsAssetDeprScheduleNew(id))} variant="secondary">
              New depreciation schedule <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </ContentCard>
      </div>
    </>
  );
}
