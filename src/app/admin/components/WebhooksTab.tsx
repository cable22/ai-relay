'use client';

import React, { useState, useEffect } from 'react';
import type { WebhookSettings, AlertThreshold } from '../types';
import WebhookList from './WebhookList';
import AlertThresholds from './AlertThresholds';
import ReportSettings from './ReportSettings';

interface WebhooksTabProps {
  apiKey: string;
  lang: 'zh' | 'en';
  t: any;
  providers: any[];
  onRefreshData?: () => Promise<void>;
}

export default function WebhooksTab({ apiKey, lang, providers, onRefreshData }: WebhooksTabProps) {
  // ---- i18n ----
  const i = lang === 'zh' ? {
    sectionTitle: '🔔 Webhook 通知管理',
    sectionDesc: '配置 Webhook 通知端点，当监控指标超过阈值或定时日报时自动推送消息。',
    addWebhook: '➕ 添加 Webhook',
    editWebhook: '编辑',
    deleteWebhook: '删除',
    testWebhook: '🧪 测试',
    testing: '测试中...',
    testSuccess: '✅ 测试消息发送成功！',
    testFailed: '❌ 测试失败',
    nameLabel: '名称',
    namePlaceholder: '例如：运维告警群',
    urlLabel: 'Webhook URL',
    urlPlaceholder: 'https://...',
    platformLabel: '平台',
    enabledLabel: '启用',
    templateLabel: '自定义模板 (JSON)',
    templatePlaceholder: '仅 generic 平台需要，留空使用默认格式',
    save: '保存',
    cancel: '取消',
    confirmDelete: '确定要删除此 Webhook 吗？',
    noWebhooks: '尚未配置任何 Webhook 通知端点。',
    thresholdTitle: '⚡ 告警阈值设置',
    thresholdDesc: '为每个服务商设置日请求数 and 日 Token 数阈值，超限时自动通过上方 Webhook 推送告警。',
    providerCol: '服务商',
    dailyRequestLimitCol: '日请求上限',
    dailyTokenLimitCol: '日 Token 上限',
    saveThresholds: '保存阈值',
    thresholdSaved: '✅ 告警阈值保存成功',
    thresholdFailed: '❌ 保存告警阈值失败',
    unlimitedPlaceholder: '不限',
    enabled: '已启用',
    disabled: '已禁用',
    createdAt: '创建于',
    updatedAt: '更新于',
    webhookSaved: '✅ Webhook 保存成功',
    webhookDeleted: '✅ Webhook 已删除',
    saveFailed: '❌ 保存失败',
    deleteFailed: '❌ 删除失败',
    reportTitle: '📊 定时日报设置',
    reportDesc: '每天在指定时间自动推送当日用量汇总到已启用的 Webhook。',
    reportTimeLabel: '推送时间 (HH:mm)',
    reportTimezoneLabel: '时区',
    saveReport: '保存日报设置',
    reportSaved: '✅ 日报设置保存成功',
    reportFailed: '❌ 日报设置保存失败',
  } : {
    sectionTitle: '🔔 Webhook Notifications',
    sectionDesc: 'Configure webhook endpoints for alert notifications and scheduled daily reports.',
    addWebhook: '➕ Add Webhook',
    editWebhook: 'Edit',
    deleteWebhook: 'Delete',
    testWebhook: '🧪 Test',
    testing: 'Testing...',
    testSuccess: '✅ Test message sent successfully!',
    testFailed: '❌ Test failed',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. Ops Alert Channel',
    urlLabel: 'Webhook URL',
    urlPlaceholder: 'https://...',
    platformLabel: 'Platform',
    enabledLabel: 'Enabled',
    templateLabel: 'Custom Template (JSON)',
    templatePlaceholder: 'Only for generic platform, leave empty for default',
    save: 'Save',
    cancel: 'Cancel',
    confirmDelete: 'Are you sure you want to delete this webhook?',
    noWebhooks: 'No webhook endpoints configured yet.',
    thresholdTitle: '⚡ Alert Thresholds',
    thresholdDesc: 'Set daily request and token limits per provider. Alerts are pushed via webhooks above when exceeded.',
    providerCol: 'Provider',
    dailyRequestLimitCol: 'Daily Request Limit',
    dailyTokenLimitCol: 'Daily Token Limit',
    saveThresholds: 'Save Thresholds',
    thresholdSaved: '✅ Alert thresholds saved successfully',
    thresholdFailed: '❌ Failed to save thresholds',
    unlimitedPlaceholder: 'Unlimited',
    enabled: 'Enabled',
    disabled: 'Disabled',
    createdAt: 'Created',
    updatedAt: 'Updated',
    webhookSaved: '✅ Webhook saved successfully',
    webhookDeleted: '✅ Webhook deleted',
    saveFailed: '❌ Save failed',
    deleteFailed: '❌ Delete failed',
    reportTitle: '📊 Scheduled Daily Report',
    reportDesc: 'Automatically push a daily usage summary to enabled webhooks at the specified time.',
    reportTimeLabel: 'Report Time (HH:mm)',
    reportTimezoneLabel: 'Timezone',
    saveReport: 'Save Report Settings',
    reportSaved: '✅ Report settings saved successfully',
    reportFailed: '❌ Failed to save report settings',
  };

  // ---- State ----
  const [settings, setSettings] = useState<WebhookSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);

  // ---- Load settings ----
  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch('/api/admin/webhooks', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      const s: WebhookSettings = data.settings || { webhooks: [], alertThresholds: [], reportTime: '21:00', reportTimezone: 'Asia/Shanghai' };
      setSettings(s);

      // Initialize thresholds — merge providers with existing
      const existing = s.alertThresholds || [];
      const merged = providers.map(p => {
        const found = existing.find(t => t.provider === p.id);
        return found || { provider: p.id };
      });
      setThresholds(merged);
    } catch {
      setSettings({ webhooks: [], alertThresholds: [], reportTime: '21:00', reportTimezone: 'Asia/Shanghai' });
      setThresholds(providers.map(p => ({ provider: p.id })));
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (loadingSettings) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: '#9ca3af' }}>
        <span className="spin">🔄</span>&nbsp;{lang === 'zh' ? '加载中...' : 'Loading...'}
      </div>
    );
  }

  const webhooks = settings?.webhooks || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-select {
          appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg fill='none' height='24' stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><polyline points='6 9 12 15 18 9'/></svg>");
          background-repeat: no-repeat;
          background-position: right 0.5rem center;
          background-size: 1rem;
          padding-right: 2rem !important;
        }
        .wh-card {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 1rem 1.25rem;
          transition: all 0.2s;
        }
        .wh-card:hover {
          border-color: rgba(67, 97, 238, 0.3);
          box-shadow: 0 0 12px rgba(67, 97, 238, 0.08);
        }
        .toggle-switch {
          position: relative;
          width: 40px;
          height: 22px;
          border-radius: 11px;
          cursor: pointer;
          transition: background-color 0.3s;
          border: none;
          outline: none;
          flex-shrink: 0;
        }
        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          transition: transform 0.3s;
        }
        .toggle-switch.active {
          background-color: #4361ee;
        }
        .toggle-switch.active::after {
          transform: translateX(18px);
        }
        .toggle-switch.inactive {
          background-color: rgba(255, 255, 255, 0.12);
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          background: #1a1a2e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 2rem;
          max-width: 520px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        }
        .threshold-input {
          width: 120px;
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background-color: rgba(0, 0, 0, 0.25);
          color: #fff;
          font-size: 0.85rem;
          outline: none;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .threshold-input:focus {
          border-color: rgba(67, 97, 238, 0.5);
        }
      `}} />

      <WebhookList
        apiKey={apiKey}
        lang={lang}
        i={i}
        webhooks={webhooks}
        fetchSettings={fetchSettings}
        onRefreshData={onRefreshData}
      />

      <AlertThresholds
        apiKey={apiKey}
        lang={lang}
        i={i}
        providers={providers}
        initialThresholds={thresholds}
      />

      <ReportSettings
        apiKey={apiKey}
        i={i}
        initialReportTime={settings?.reportTime || '21:00'}
        initialReportTimezone={settings?.reportTimezone || 'Asia/Shanghai'}
      />
    </div>
  );
}
