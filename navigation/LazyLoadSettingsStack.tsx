import React, { lazy, Suspense } from 'react';

import Currency from '../screen/settings/Currency';
import Language from '../screen/settings/Language';
import { LazyLoadingIndicator } from './LazyLoadingIndicator'; // Assume you have this component for loading indication
import SettingsBlockExplorer from '../screen/settings/SettingsBlockExplorer';

const Settings = lazy(() => import('../screen/settings/Settings'));
const GeneralSettings = lazy(() => import('../screen/settings/GeneralSettings'));
const Licensing = lazy(() => import('../screen/settings/Licensing'));
const NetworkSettings = lazy(() => import('../screen/settings/NetworkSettings'));
const About = lazy(() => import('../screen/settings/About'));
const DefaultView = lazy(() => import('../screen/settings/DefaultView'));
const ElectrumSettings = lazy(() => import('../screen/settings/ElectrumSettings'));
const SupportSettings = lazy(() => import('../screen/settings/SupportSettings'));
const EncryptStorage = lazy(() => import('../screen/settings/EncryptStorage'));
const LightningSettings = lazy(() => import('../screen/settings/LightningSettings'));
const NotificationSettings = lazy(() => import('../screen/settings/NotificationSettings'));
const SelfTest = lazy(() => import('../screen/settings/SelfTest'));
const ReleaseNotes = lazy(() => import('../screen/settings/ReleaseNotes'));
const Tools = lazy(() => import('../screen/settings/tools'));
const SettingsPrivacy = lazy(() => import('../screen/settings/SettingsPrivacy'));
const PlausibleDeniability = lazy(() => import('../screen/PlausibleDeniability'));

export const SettingsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <Settings />
  </Suspense>
);

export const CurrencyComponent = () => <Currency />;

export const GeneralSettingsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <GeneralSettings />
  </Suspense>
);

export const LicensingComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <Licensing />
  </Suspense>
);

export const NetworkSettingsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <NetworkSettings />
  </Suspense>
);

export const BlockExplorerSettingsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SettingsBlockExplorer />
  </Suspense>
);

export const AboutComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <About />
  </Suspense>
);

export const DefaultViewComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <DefaultView />
  </Suspense>
);

export const ElectrumSettingsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ElectrumSettings />
  </Suspense>
);

export const SupportSettingsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SupportSettings />
  </Suspense>
);

export const EncryptStorageComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <EncryptStorage />
  </Suspense>
);

export const LanguageComponent = () => <Language />;

export const LightningSettingsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LightningSettings />
  </Suspense>
);

export const NotificationSettingsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <NotificationSettings />
  </Suspense>
);

export const SelfTestComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SelfTest />
  </Suspense>
);

export const ReleaseNotesComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ReleaseNotes />
  </Suspense>
);

export const ToolsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <Tools />
  </Suspense>
);

export const SettingsPrivacyComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SettingsPrivacy />
  </Suspense>
);

export const PlausibleDeniabilityComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <PlausibleDeniability />
  </Suspense>
);
