import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Save, ShieldCheck } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makePartnersApi } from '../api/partners.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { CurrencySelect } from '../../../shared/components/forms/CurrencySelect.jsx';
import { PaymentTermsSelect } from '../../../shared/components/forms/PaymentTermsSelect.jsx';
import { TaxCodeSelect } from '../../../shared/components/forms/TaxCodeSelect.jsx';
import { JurisdictionSelect } from '../../../shared/components/forms/JurisdictionSelect.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { PARTNER_TAX_TREATMENT_OPTIONS, buildPartnerTaxProfilePayload, getPartnerTaxFormVisibility, normalizePartnerTaxFormForSubmit, normalizePartnerTaxFormState } from '../../../shared/tax/frontendTax.js';

export default function PartnerCreate() {
  const { http } = useApi();
  const api = useMemo(() => makePartnersApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'vendor' ? 'vendor' : 'customer';
  const [tab, setTab] = useState('core');

  const [form, setForm] = useState(() => normalizePartnerTaxFormState({
    type: initialType,
    name: '',
    code: '',
    email: '',
    phone: '',
    status: 'active',
    defaultReceivableAccountId: '',
    defaultPayableAccountId: '',
    paymentTermsId: '',
    notes: '',

    taxIdNumber: '',
    vatRegistrationNumber: '',
    taxRegistrationStatus: 'registered',
    taxTreatment: initialType === 'vendor' ? 'standard_input' : 'standard_output',
    defaultTaxCodeId: '',
    purchaseTaxCodeId: '',
    salesTaxCodeId: '',
    jurisdictionId: '',
    withholdingEnabled: false,
    withholdingTaxCodeId: '',
    withholdingRate: '',
    recoverabilityPercent: initialType === 'vendor' ? '100' : '',
    exemptionReasonCode: '',
    exemptionCertificateNumber: '',
    exemptionExpiryDate: '',
    reverseChargeEligible: false,
    taxCountryCode: '',
    taxRegionCode: '',
    placeOfSupplyBasis: 'customer_location',
    eInvoiceScheme: '',
    buyerReference: '',
    filingCurrency: 'USD'
  }));

  const set = (key, value) => {
    setForm((s) => normalizePartnerTaxFormState({ ...s, [key]: value }));
  };

  const {
    isCustomer,
    isVendor,
    showDefaultReceivable,
    showDefaultPayable,
    showSalesTaxCode,
    showPurchaseTaxCode,
    showDefaultTaxCode,
    showRecoverability,
    showWithholdingSection,
    showReverseChargeEligible,
    showExemptionFields,
    showBuyerReference
  } = getPartnerTaxFormVisibility(form);

  const create = useMutation({
    mutationFn: async () => {
      const clean = normalizePartnerTaxFormForSubmit(form);

      const created = await api.create({
        type: clean.type,
        name: clean.name,
        code: clean.code || undefined,
        email: clean.email || undefined,
        phone: clean.phone || undefined,
        status: clean.status || undefined,
        defaultReceivableAccountId: clean.defaultReceivableAccountId || undefined,
        defaultPayableAccountId: clean.defaultPayableAccountId || undefined,
        paymentTermsId: clean.paymentTermsId || undefined,
        notes: clean.notes || undefined
      });

      const partnerId = created?.id ?? created?.data?.id;
      if (partnerId) {
        await api.setTaxProfile(
          partnerId,
          buildPartnerTaxProfilePayload({ ...clean, name: clean.name })
        );
      }

      return created;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: qk.partners() });
      toast.success('Partner created successfully');
      const id = created?.id ?? created?.data?.id;
      navigate(
        id
          ? ROUTES.businessPartnerDetail(id)
          : form.type === 'vendor'
            ? ROUTES.businessVendors
            : ROUTES.businessCustomers
      );
    },
    onError: (e) =>
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          'Failed to create partner'
      )
  });

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={`New ${isVendor ? 'vendor' : 'customer'}`}
        subtitle="Create a business partner with dynamic field visibility aligned to partner type and tax treatment."
        icon={Building2}
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'core', label: 'Core profile' },
          { value: 'tax', label: 'Tax profile' }
        ]}
      />

      {tab === 'core' ? (
        <ContentCard
          title="Partner master"
          actions={
            <Button
              variant="outline"
              leftIcon={ArrowLeft}
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              options={[
                { value: 'customer', label: 'Customer' },
                { value: 'vendor', label: 'Vendor' }
              ]}
            />

            <Select
              label="Status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />

            <Input
              label="Business name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />

            <Input
              label="Partner code"
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
            />

            <Input
              label="Email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />

            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />

            <PaymentTermsSelect
              label="Payment terms"
              value={form.paymentTermsId}
              onChange={(e) => set('paymentTermsId', e.target.value)}
              allowEmpty
            />

            {showDefaultReceivable ? (
              <AccountSelect
                label="Default receivable account"
                value={form.defaultReceivableAccountId}
                onChange={(e) =>
                  set('defaultReceivableAccountId', e.target.value)
                }
                filters={{ accountTypeCodes: ['ASSET'] }}
                allowEmpty
              />
            ) : null}

            {showDefaultPayable ? (
              <AccountSelect
                label="Default payable account"
                value={form.defaultPayableAccountId}
                onChange={(e) =>
                  set('defaultPayableAccountId', e.target.value)
                }
                filters={{ accountTypeCodes: ['LIABILITY'] }}
                allowEmpty
              />
            ) : null}

            <div className="md:col-span-2">
              <Textarea
                label="Notes"
                rows={4}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </div>
        </ContentCard>
      ) : (
        <div className="space-y-6">
          <ContentCard
            title="Tax registration"
            actions={
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <ShieldCheck className="h-4 w-4" />
                Used by determination engine
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Input
                label="Tax ID number"
                value={form.taxIdNumber}
                onChange={(e) => set('taxIdNumber', e.target.value)}
              />
              <Input
                label="VAT registration number"
                value={form.vatRegistrationNumber}
                onChange={(e) => set('vatRegistrationNumber', e.target.value)}
              />
              <Select
                label="Registration status"
                value={form.taxRegistrationStatus}
                onChange={(e) => set('taxRegistrationStatus', e.target.value)}
                options={[
                  { value: 'registered', label: 'Registered' },
                  { value: 'unregistered', label: 'Unregistered' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'suspended', label: 'Suspended' }
                ]}
              />
              <JurisdictionSelect
                label="Jurisdiction"
                value={form.jurisdictionId}
                onChange={(e) => set('jurisdictionId', e.target.value)}
                allowEmpty
              />
              <Input
                label="Tax country code"
                value={form.taxCountryCode}
                onChange={(e) =>
                  set('taxCountryCode', e.target.value.toUpperCase())
                }
                maxLength={2}
              />
              <Input
                label="Tax region code"
                value={form.taxRegionCode}
                onChange={(e) => set('taxRegionCode', e.target.value)}
              />
            </div>
          </ContentCard>

          <ContentCard title="Tax defaults">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Select
                label="Tax treatment"
                value={form.taxTreatment}
                onChange={(e) => set('taxTreatment', e.target.value)}
                options={PARTNER_TAX_TREATMENT_OPTIONS[form.type]}
              />

              {showDefaultTaxCode ? (
                <TaxCodeSelect
                  label="Default tax code"
                  value={form.defaultTaxCodeId}
                  onChange={(e) => set('defaultTaxCodeId', e.target.value)}
                  allowEmpty
                />
              ) : null}

              <Select
                label="Place of supply basis"
                value={form.placeOfSupplyBasis}
                onChange={(e) => set('placeOfSupplyBasis', e.target.value)}
                options={[
                  { value: 'customer_location', label: 'Customer location' },
                  { value: 'supplier_location', label: 'Supplier location' },
                  { value: 'ship_to', label: 'Ship-to address' },
                  {
                    value: 'service_performance',
                    label: 'Service performance location'
                  }
                ]}
              />

              {showSalesTaxCode ? (
                <TaxCodeSelect
                  label="Sales tax code"
                  value={form.salesTaxCodeId}
                  onChange={(e) => set('salesTaxCodeId', e.target.value)}
                  allowEmpty
                />
              ) : null}

              {showPurchaseTaxCode ? (
                <TaxCodeSelect
                  label="Purchase tax code"
                  value={form.purchaseTaxCodeId}
                  onChange={(e) => set('purchaseTaxCodeId', e.target.value)}
                  allowEmpty
                />
              ) : null}

              {showRecoverability ? (
                <Input
                  label="Recoverability (%)"
                  type="number"
                  value={form.recoverabilityPercent}
                  onChange={(e) =>
                    set('recoverabilityPercent', e.target.value)
                  }
                />
              ) : null}
            </div>
          </ContentCard>

          <ContentCard title="Withholding">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm md:col-span-2 xl:col-span-3">
                <input
                  type="checkbox"
                  checked={form.withholdingEnabled}
                  onChange={(e) => set('withholdingEnabled', e.target.checked)}
                />
                Withholding enabled
              </label>

              {showWithholdingSection ? (
                <>
                  <TaxCodeSelect
                    label="Withholding tax code"
                    value={form.withholdingTaxCodeId}
                    onChange={(e) => set('withholdingTaxCodeId', e.target.value)}
                    allowEmpty
                  />
                  <Input
                    label="Withholding rate (%)"
                    type="number"
                    value={form.withholdingRate}
                    onChange={(e) => set('withholdingRate', e.target.value)}
                  />
                </>
              ) : null}
            </div>
          </ContentCard>

          <ContentCard title="Exceptions and compliance">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {showReverseChargeEligible ? (
                <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.reverseChargeEligible}
                    onChange={(e) =>
                      set('reverseChargeEligible', e.target.checked)
                    }
                  />
                  Reverse charge eligible
                </label>
              ) : null}

              {showExemptionFields ? (
                <>
                  <Input
                    label="Exemption reason"
                    value={form.exemptionReasonCode}
                    onChange={(e) =>
                      set('exemptionReasonCode', e.target.value)
                    }
                  />
                  <Input
                    label="Exemption certificate"
                    value={form.exemptionCertificateNumber}
                    onChange={(e) =>
                      set('exemptionCertificateNumber', e.target.value)
                    }
                  />
                  <Input
                    label="Exemption expiry"
                    type="date"
                    value={form.exemptionExpiryDate}
                    onChange={(e) =>
                      set('exemptionExpiryDate', e.target.value)
                    }
                  />
                </>
              ) : null}

              <Input
                label="E-invoice scheme"
                value={form.eInvoiceScheme}
                onChange={(e) => set('eInvoiceScheme', e.target.value)}
                placeholder="PEPPOL / GRA / etc."
              />

              {showBuyerReference ? (
                <Input
                  label="Buyer reference"
                  value={form.buyerReference}
                  onChange={(e) => set('buyerReference', e.target.value)}
                />
              ) : null}

              <CurrencySelect
                label="Filing currency"
                value={form.filingCurrency}
                onChange={(e) => set('filingCurrency', e.target.value)}
                allowEmpty
              />
            </div>
          </ContentCard>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setTab(tab === 'core' ? 'tax' : 'core')}
        >
          {tab === 'core' ? 'Next: tax profile' : 'Back to core'}
        </Button>
        <Button
          leftIcon={Save}
          onClick={() => create.mutate()}
          disabled={create.isPending || !form.name.trim()}
        >
          {create.isPending ? 'Creating…' : 'Create partner'}
        </Button>
      </div>
    </div>
  );
}