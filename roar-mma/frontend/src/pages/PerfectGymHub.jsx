import { useState, useCallback } from 'react';
import MembershipManagement from './perfectgym/MembershipManagement';
import AutomatedBilling from './perfectgym/AutomatedBilling';
import AccessControl from './perfectgym/AccessControl';
import ClassBooking from './perfectgym/ClassBooking';
import CRMLeads from './perfectgym/CRMLeads';
import MarketingAutomation from './perfectgym/MarketingAutomation';
import BrandedMemberApp from './perfectgym/BrandedMemberApp';
import PointOfSale from './perfectgym/PointOfSale';
import ReportingAnalytics from './perfectgym/ReportingAnalytics';
import KioskPortal from './perfectgym/KioskPortal';
import StaffManagement from './perfectgym/StaffManagement';
import MultiLocation from './perfectgym/MultiLocation';

const FEATURES = [
  { id: 'membership', name: 'Membership Management', icon: '📋', component: MembershipManagement },
  { id: 'billing', name: 'Automated Billing & Payments', icon: '💳', component: AutomatedBilling },
  { id: 'access', name: 'Access Control', icon: '🔐', component: AccessControl },
  { id: 'booking', name: 'Class & PT Booking', icon: '🥋', component: ClassBooking },
  { id: 'crm', name: 'CRM & Lead Management', icon: '🎯', component: CRMLeads },
  { id: 'marketing', name: 'Marketing Automation', icon: '📢', component: MarketingAutomation },
  { id: 'app', name: 'Branded Member App', icon: '📱', component: BrandedMemberApp },
  { id: 'pos', name: 'Point of Sale', icon: '🛒', component: PointOfSale },
  { id: 'reports', name: 'Reporting & Analytics', icon: '📊', component: ReportingAnalytics },
  { id: 'kiosk', name: 'Self-Service Kiosk', icon: '🖥️', component: KioskPortal },
  { id: 'staff', name: 'Staff Management', icon: '👔', component: StaffManagement },
  { id: 'locations', name: 'Multi-Location Management', icon: '🏢', component: MultiLocation },
];

export default function PerfectGymHub() {
  const [activeFeature, setActiveFeature] = useState(null);

  const handleBack = useCallback(() => {
    setActiveFeature(null);
  }, []);

  if (activeFeature) {
    const feature = FEATURES.find(f => f.id === activeFeature);
    if (feature) {
      const Component = feature.component;
      return (
        <div className="p-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
          >
            ← Back to PerfectGym Features
          </button>
          <Component />
        </div>
      );
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">PerfectGym Feature Suite</h1>
        <p className="text-sm text-gray-500 mt-1">
          12 new features — select one to explore
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {FEATURES.map(feature => (
          <button
            key={feature.id}
            onClick={() => setActiveFeature(feature.id)}
            className="card card-hover text-left flex items-center gap-4 p-5"
          >
            <span className="text-3xl">{feature.icon}</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{feature.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Click to open</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500">
          All features are additive — no existing code was modified.
        </p>
      </div>
    </div>
  );
}
