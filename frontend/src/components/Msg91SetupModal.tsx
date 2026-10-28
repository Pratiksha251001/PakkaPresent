import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Send,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Terminal,
  HelpCircle,
  Radio,
  Sliders,
  Globe,
  Code2,
} from "lucide-react";
import {
  getSmsGatewayStatus,
  sendTestSmsViaGateway,
  updateSmsGatewayConfig,
  SmsGatewayStatus,
  SmsProviderType,
} from "../lib/smsService";

interface Msg91SetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestSent?: () => void;
}

export const Msg91SetupModal: React.FC<Msg91SetupModalProps> = ({
  open,
  onOpenChange,
  onTestSent,
}) => {
  const [activeTab, setActiveTab] = useState<"test" | "providers" | "guide">(
    "test",
  );
  const [status, setStatus] = useState<SmsGatewayStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Selected provider in settings tab
  const [selectedProvider, setSelectedProvider] =
    useState<SmsProviderType>("fast2sms");

  // Provider-specific input state
  // 1. Fast2SMS
  const [fast2smsApiKey, setFast2smsApiKey] = useState("");
  const [fast2smsRoute, setFast2smsRoute] = useState("q");

  // 2. MSG91
  const [msg91AuthKey, setMsg91AuthKey] = useState("");
  const [msg91SenderId, setMsg91SenderId] = useState("EDUTRK");
  const [msg91Route, setMsg91Route] = useState("4");
  const [msg91TemplateId, setMsg91TemplateId] = useState("");
  const [msg91DltTeId, setMsg91DltTeId] = useState("");

  // 3. Twilio
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioFromNumber, setTwilioFromNumber] = useState("");

  // 4. Textlocal
  const [textlocalApiKey, setTextlocalApiKey] = useState("");
  const [textlocalSender, setTextlocalSender] = useState("TXTLCL");

  // 5. Custom Gateway
  const [customUrl, setCustomUrl] = useState("");
  const [customMethod, setCustomMethod] = useState<"POST" | "GET">("POST");
  const [customHeaders, setCustomHeaders] = useState(
    '{\n  "Content-Type": "application/json"\n}',
  );
  const [customBody, setCustomBody] = useState(
    '{\n  "to": "{clean10}",\n  "message": "{message}"\n}',
  );
  const [customApiKey, setCustomApiKey] = useState("");
  const [customSenderId, setCustomSenderId] = useState("EDUTRK");

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveStatus, setConfigSaveStatus] = useState<string | null>(null);

  // Test form state
  const [testMobile, setTestMobile] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Dear Parent, Student Rohan Patil is absent for Mathematics today. Marked via PakkaPresent SMIT.",
  );
  const [testPreset, setTestPreset] = useState<"en" | "mr" | "hi" | "custom">(
    "en",
  );
  const [testProviderChoice, setTestProviderChoice] =
    useState<string>("active");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    raw?: any;
    simulated?: boolean;
    carrierBlocked?: boolean;
    error418?: boolean;
    serverIp?: string;
    gateway?: string;
    messageId?: string;
    time?: string;
  } | null>(null);

  const [copiedIp, setCopiedIp] = useState(false);

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2500);
  };

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await getSmsGatewayStatus();
      setStatus(data);
      if (data.activeProvider) {
        setSelectedProvider(data.activeProvider as SmsProviderType);
      } else if (data.provider) {
        setSelectedProvider(data.provider as SmsProviderType);
      }

      // Populate provider fields from server status if available
      if (data.fast2sms?.apiKey) setFast2smsApiKey(data.fast2sms.apiKey);
      if (data.fast2sms?.route) setFast2smsRoute(data.fast2sms.route);

      if (data.msg91?.authKey) setMsg91AuthKey(data.msg91.authKey);
      if (data.msg91?.senderId) setMsg91SenderId(data.msg91.senderId);
      if (data.msg91?.templateId) setMsg91TemplateId(data.msg91.templateId);
      if (data.msg91?.route) setMsg91Route(data.msg91.route);
      if (data.msg91?.dltTeId) setMsg91DltTeId(data.msg91.dltTeId);

      if (data.twilio?.accountSid) setTwilioAccountSid(data.twilio.accountSid);
      if (data.twilio?.authToken) setTwilioAuthToken(data.twilio.authToken);
      if (data.twilio?.fromNumber) setTwilioFromNumber(data.twilio.fromNumber);

      if (data.textlocal?.apiKey) setTextlocalApiKey(data.textlocal.apiKey);
      if (data.textlocal?.sender) setTextlocalSender(data.textlocal.sender);

      if (data.custom?.url) setCustomUrl(data.custom.url);
      if (data.custom?.method)
        setCustomMethod(data.custom.method as "POST" | "GET");
      if (data.custom?.headers) setCustomHeaders(data.custom.headers);
      if (data.custom?.bodyTemplate) setCustomBody(data.custom.bodyTemplate);
      if (data.custom?.apiKey) setCustomApiKey(data.custom.apiKey);
      if (data.custom?.senderId) setCustomSenderId(data.custom.senderId);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStatus();
      setTestResult(null);
      setConfigSaveStatus(null);
    }
  }, [open]);

  const handleSaveActiveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigSaveStatus(null);

    try {
      const payload: any = {
        activeProvider: selectedProvider,
      };

      if (selectedProvider === "fast2sms") {
        payload.fast2sms = {
          apiKey: fast2smsApiKey.trim(),
          route: fast2smsRoute.trim(),
        };
      } else if (selectedProvider === "msg91") {
        payload.msg91 = {
          authKey: msg91AuthKey.trim(),
          senderId: msg91SenderId.trim(),
          templateId: msg91TemplateId.trim(),
          route: msg91Route.trim(),
          dltTeId: msg91DltTeId.trim(),
        };
      } else if (selectedProvider === "twilio") {
        payload.twilio = {
          accountSid: twilioAccountSid.trim(),
          authToken: twilioAuthToken.trim(),
          fromNumber: twilioFromNumber.trim(),
        };
      } else if (selectedProvider === "textlocal") {
        payload.textlocal = {
          apiKey: textlocalApiKey.trim(),
          sender: textlocalSender.trim(),
        };
      } else if (selectedProvider === "custom") {
        payload.custom = {
          url: customUrl.trim(),
          method: customMethod,
          headers: customHeaders.trim(),
          bodyTemplate: customBody.trim(),
          apiKey: customApiKey.trim(),
          senderId: customSenderId.trim(),
        };
      }

      const res = await updateSmsGatewayConfig(payload);
      if (res.success) {
        setConfigSaveStatus(
          `Success! ${selectedProvider.toUpperCase()} is now your active SMS Gateway.`,
        );
        await fetchStatus();
      } else {
        setConfigSaveStatus("Save failed: " + res.message);
      }
    } catch (err: any) {
      setConfigSaveStatus("Error: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handlePresetChange = (preset: "en" | "mr" | "hi" | "custom") => {
    setTestPreset(preset);
    if (preset === "en") {
      setTestMessage(
        "Dear Parent, Student Rohan Patil is absent for Mathematics today. Marked via PakkaPresent SMIT.",
      );
    } else if (preset === "mr") {
      setTestMessage(
        "पालकहो, विद्यार्थी रोहन पाटील आज गणित विषयाच्या तासाला गैरहजर आहे. - PakkaPresent SMIT",
      );
    } else if (preset === "hi") {
      setTestMessage(
        "प्रिय अभिभावक, छात्र रोहन पाटिल आज गणित कक्षा में अनुपस्थित है। - PakkaPresent SMIT",
      );
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumbers = testMobile.replace(/[^0-9]/g, "");
    if (!cleanNumbers || cleanNumbers.length < 10) {
      setTestResult({
        success: false,
        message:
          "Kripya valid 10-digit mobile number dalein (e.g. 9876543210).",
        time: new Date().toLocaleTimeString(),
      });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const chosenProvider =
        testProviderChoice === "active"
          ? status?.activeProvider || "fast2sms"
          : testProviderChoice;
      const res = await sendTestSmsViaGateway(
        testMobile.trim(),
        testMessage.trim(),
        {
          provider: chosenProvider,
        },
      );

      setTestResult({
        success: res.success,
        message: res.message,
        simulated: res.simulated,
        raw: res.rawResponse,
        carrierBlocked: res.carrierBlocked,
        error418: res.error418,
        serverIp: res.serverIp,
        gateway: res.gateway,
        messageId: res.messageId,
        time: new Date().toLocaleTimeString(),
      });
      fetchStatus();
      onTestSent?.();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Test dispatch failed",
        time: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const activeProviderName = (
    status?.activeProvider ||
    status?.provider ||
    "fast2sms"
  ).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden bg-background p-0">
        {/* Header */}
        <DialogHeader className="border-b border-border/60 bg-muted/20 px-6 pb-3 pt-5 pr-14">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Universal SMS Gateway Setup
                </DialogTitle>
                {status?.isConfigured ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                    <CheckCircle className="h-3 w-3 mr-1 inline" />{" "}
                    {activeProviderName} Live Active
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs"
                  >
                    <Radio className="h-3 w-3 mr-1 inline animate-pulse" />{" "}
                    Simulation Mode
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-foreground/70">
                Configure an SMS provider to send parent notifications.
              </DialogDescription>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStatus}
              disabled={loadingStatus}
              className="h-8 px-2 text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingStatus ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border/40 pt-3 sm:grid-cols-3">
            <button
              onClick={() => setActiveTab("test")}
              className={`flex h-10 w-full items-center justify-center gap-1 rounded-lg px-2 py-2 text-center text-[11px] font-semibold whitespace-nowrap transition-all ${
                activeTab === "test"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              Live Test
            </button>
            <button
              onClick={() => setActiveTab("providers")}
              className={`flex h-10 w-full items-center justify-center gap-1 rounded-lg px-2 py-2 text-center text-[11px] font-semibold whitespace-nowrap transition-all ${
                activeTab === "providers"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Providers
            </button>
            <button
              onClick={() => setActiveTab("guide")}
              className={`flex h-10 w-full items-center justify-center gap-1 rounded-lg px-2 py-2 text-center text-[11px] font-semibold whitespace-nowrap transition-all ${
                activeTab === "guide"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Diagnostics
            </button>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5 pr-5 [scrollbar-gutter:stable]">
          {/* TAB 1: LIVE TEST SMS */}
          {activeTab === "test" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-start gap-3">
                <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    Active Gateway:{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {activeProviderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      (
                      {status?.isConfigured
                        ? "Real Carrier Mode"
                        : "Simulation Mode"}
                      )
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    Send a test message through the active gateway.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendTest} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Parent / Recipient Mobile Number (10 Digits) *
                  </label>
                  <Input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={testMobile}
                    onChange={(e) => setTestMobile(e.target.value)}
                    className="font-mono text-sm tracking-wide"
                    maxLength={13}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Simple Text Message
                    </label>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handlePresetChange("en")}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          testPreset === "en"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetChange("mr")}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          testPreset === "mr"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        मराठी
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetChange("hi")}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          testPreset === "hi"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        हिंदी
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetChange("custom")}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          testPreset === "custom"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={testMessage}
                    onChange={(e) => {
                      setTestMessage(e.target.value);
                      setTestPreset("custom");
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Enter message text..."
                    required
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                    <span>Characters: {testMessage.length}</span>
                    <span>
                      Standard cellular SMS: 1 credit per 160 characters
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    type="submit"
                    disabled={isSendingTest}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 shadow-xs"
                  >
                    {isSendingTest ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Dispatching to Carrier...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Send Live Test SMS Now
                      </>
                    )}
                  </Button>

                  <span className="text-xs text-foreground/70">
                    Sent via: <strong>{activeProviderName}</strong>
                  </span>
                </div>
              </form>

              {/* Real-time result feedback */}
              {testResult && (
                <div
                  className={`rounded-xl border p-4 text-xs space-y-2.5 transition-all ${
                    testResult.success
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                      : "border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-100"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      {testResult.success
                        ? "SMS Dispatched Successfully!"
                        : "Dispatch Rejected / Notice"}
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">
                      {testResult.time}
                    </span>
                  </div>

                  <p className="leading-relaxed">{testResult.message}</p>

                  {testResult.error418 && (
                    <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> MSG91 Error 418
                        IP Restriction:
                      </div>
                      <p>
                        MSG91 account me IP Whitelist enabled hai. MSG91
                        Dashboard me jakar AuthKey ki IP restriction DISABLE
                        karein, ya server IP whitelist karein:
                      </p>
                      {testResult.serverIp && (
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-background/80 px-2 py-0.5 rounded font-mono font-bold">
                            {testResult.serverIp}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyIp(testResult.serverIp!)}
                            className="text-xs underline font-semibold"
                          >
                            {copiedIp ? "Copied!" : "Copy IP"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {testResult.raw && (
                    <details className="text-[10px] bg-background/50 rounded-md p-2 border border-border/50">
                      <summary className="cursor-pointer font-mono font-semibold opacity-80">
                        View Raw Carrier Response
                      </summary>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono p-1">
                        {typeof testResult.raw === "string"
                          ? testResult.raw
                          : JSON.stringify(testResult.raw, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROVIDERS & CREDENTIALS */}
          {activeTab === "providers" && (
            <div className="space-y-4">
              <div className="text-xs text-foreground/70">
                Choose a provider, enter its credentials, and save it as active.
              </div>

              {/* Provider Selector Tabs */}
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/35 p-1.5 sm:grid-cols-5">
                <button
                  type="button"
                  onClick={() => setSelectedProvider("fast2sms")}
                  className={`flex min-h-[64px] flex-col items-center justify-center rounded-lg px-2 py-2 text-center text-[11px] font-semibold leading-tight transition-all ${
                    selectedProvider === "fast2sms"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ⚡ Fast2SMS
                  <span className="mt-1 block text-[10px] font-medium leading-snug text-emerald-700 dark:text-emerald-300 font-sans">
                    Simple • No DLT
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider("msg91")}
                  className={`flex min-h-[64px] flex-col items-center justify-center rounded-lg px-2 py-2 text-center text-[11px] font-semibold leading-tight transition-all ${
                    selectedProvider === "msg91"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📱 MSG91
                  <span className="mt-1 block text-[10px] font-medium leading-snug text-foreground/70 font-sans">
                    Flow & HTTP
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider("twilio")}
                  className={`flex min-h-[64px] flex-col items-center justify-center rounded-lg px-2 py-2 text-center text-[11px] font-semibold leading-tight transition-all ${
                    selectedProvider === "twilio"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🌐 Twilio
                  <span className="mt-1 block text-[10px] font-medium leading-snug text-foreground/70 font-sans">
                    Global SMS
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider("textlocal")}
                  className={`flex min-h-[64px] flex-col items-center justify-center rounded-lg px-2 py-2 text-center text-[11px] font-semibold leading-tight transition-all ${
                    selectedProvider === "textlocal"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📩 Textlocal
                  <span className="mt-1 block text-[10px] font-medium leading-snug text-foreground/70 font-sans">
                    India / UK
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider("custom")}
                  className={`flex min-h-[64px] flex-col items-center justify-center rounded-lg px-2 py-2 text-center text-[11px] font-semibold leading-tight transition-all ${
                    selectedProvider === "custom"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🛠️ Custom API
                  <span className="mt-1 block text-[10px] font-medium leading-snug text-foreground/70 font-sans">
                    Any REST URL
                  </span>
                </button>
              </div>

              {/* Provider Config Forms */}
              <form
                onSubmit={handleSaveActiveConfig}
                className="space-y-4 pt-1"
              >
                {/* 1. Fast2SMS Form */}
                {selectedProvider === "fast2sms" && (
                  <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-emerald-500" />
                        Fast2SMS Gateway Configuration
                      </div>
                      <a
                        href="https://www.fast2sms.com"
                        target="_blank"
                        rel="noreferrer"
                        className="dashboard-accent-link inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                      >
                        fast2sms.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-xs text-foreground/70">
                      Enter the API key and select the required SMS route.
                    </p>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Fast2SMS Authorization API Key *
                      </label>
                      <Input
                        type="password"
                        placeholder="Paste your Fast2SMS API key here..."
                        value={fast2smsApiKey}
                        onChange={(e) => setFast2smsApiKey(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          SMS Route
                        </label>
                        <select
                          value={fast2smsRoute}
                          onChange={(e) => setFast2smsRoute(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                        >
                          <option value="q">
                            Quick SMS (route=q, No DLT required)
                          </option>
                          <option value="otp">
                            OTP / Fast Delivery (route=otp)
                          </option>
                          <option value="v3">V3 Route (route=v3)</option>
                          <option value="dlt">DLT Approved (route=dlt)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Language Mode
                        </label>
                        <div className="h-9 flex items-center text-xs text-muted-foreground px-2">
                          Auto (English / Marathi / Hindi Unicode supported)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MSG91 Form */}
                {selectedProvider === "msg91" && (
                  <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        MSG91 Gateway Configuration
                      </div>
                      <a
                        href="https://control.msg91.com"
                        target="_blank"
                        rel="noreferrer"
                        className="dashboard-accent-link inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                      >
                        msg91.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        MSG91 AuthKey *
                      </label>
                      <Input
                        type="password"
                        placeholder="Enter your MSG91 AuthKey..."
                        value={msg91AuthKey}
                        onChange={(e) => setMsg91AuthKey(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Sender ID
                        </label>
                        <Input
                          placeholder="e.g. EDUTRK"
                          value={msg91SenderId}
                          onChange={(e) => setMsg91SenderId(e.target.value)}
                          maxLength={6}
                          className="font-mono text-xs uppercase"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Route
                        </label>
                        <Input
                          placeholder="e.g. 4"
                          value={msg91Route}
                          onChange={(e) => setMsg91Route(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Flow Template ID (Optional)
                        </label>
                        <Input
                          placeholder="e.g. 64b8f... (For MSG91 Flow API)"
                          value={msg91TemplateId}
                          onChange={(e) => setMsg91TemplateId(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          DLT Template ID (DLT_TE_ID)
                        </label>
                        <Input
                          placeholder="e.g. 170716..."
                          value={msg91DltTeId}
                          onChange={(e) => setMsg91DltTeId(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Twilio Form */}
                {selectedProvider === "twilio" && (
                  <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Globe className="h-4 w-4 text-purple-500" />
                        Twilio SMS Configuration
                      </div>
                      <a
                        href="https://console.twilio.com"
                        target="_blank"
                        rel="noreferrer"
                        className="dashboard-accent-link inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                      >
                        twilio.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Account SID *
                      </label>
                      <Input
                        placeholder="e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={twilioAccountSid}
                        onChange={(e) => setTwilioAccountSid(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Auth Token *
                      </label>
                      <Input
                        type="password"
                        placeholder="Twilio Auth Token"
                        value={twilioAuthToken}
                        onChange={(e) => setTwilioAuthToken(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        From Phone Number *
                      </label>
                      <Input
                        placeholder="e.g. +1234567890"
                        value={twilioFromNumber}
                        onChange={(e) => setTwilioFromNumber(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 4. Textlocal Form */}
                {selectedProvider === "textlocal" && (
                  <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-amber-500" />
                        Textlocal SMS Configuration
                      </div>
                      <a
                        href="https://www.textlocal.in"
                        target="_blank"
                        rel="noreferrer"
                        className="dashboard-accent-link inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                      >
                        textlocal.in <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Textlocal API Key *
                      </label>
                      <Input
                        type="password"
                        placeholder="Textlocal API Key"
                        value={textlocalApiKey}
                        onChange={(e) => setTextlocalApiKey(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Sender Name
                      </label>
                      <Input
                        placeholder="e.g. TXTLCL"
                        value={textlocalSender}
                        onChange={(e) => setTextlocalSender(e.target.value)}
                        maxLength={6}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 5. Custom API / Webhook Form */}
                {selectedProvider === "custom" && (
                  <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Code2 className="h-4 w-4 text-emerald-500" />
                      Custom Gateway / Webhook / Any REST API
                    </div>
                    <p className="text-xs text-foreground/70">
                      Connect any REST SMS gateway using{" "}
                      <code>{"{clean10}"}</code>, <code>{"{with91}"}</code>,{" "}
                      <code>{"{message}"}</code>, or <code>{"{apiKey}"}</code>.
                    </p>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-xs font-semibold text-foreground">
                          Method
                        </label>
                        <select
                          value={customMethod}
                          onChange={(e) =>
                            setCustomMethod(e.target.value as any)
                          }
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="POST">POST</option>
                          <option value="GET">GET</option>
                        </select>
                      </div>
                      <div className="space-y-1 sm:col-span-1 lg:col-span-3">
                        <label className="text-xs font-semibold text-foreground">
                          Gateway Endpoint URL *
                        </label>
                        <Input
                          placeholder="https://api.sms-provider.com/v1/send"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          className="font-mono text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">
                          Custom Headers (JSON)
                        </label>
                        <textarea
                          rows={3}
                          value={customHeaders}
                          onChange={(e) => setCustomHeaders(e.target.value)}
                          className="w-full rounded-md border border-input bg-background p-2 font-mono text-[11px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">
                          {customMethod === "POST"
                            ? "Payload Template (JSON)"
                            : "Query Parameters"}
                        </label>
                        <textarea
                          rows={3}
                          value={customBody}
                          onChange={(e) => setCustomBody(e.target.value)}
                          className="w-full rounded-md border border-input bg-background p-2 font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Save button and status message */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingConfig}
                    className="font-semibold text-xs bg-primary text-primary-foreground shadow-xs"
                  >
                    {isSavingConfig ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Saving Configuration...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Save & Set {selectedProvider.toUpperCase()} as Active
                        Gateway
                      </>
                    )}
                  </Button>
                </div>

                {configSaveStatus && (
                  <div
                    className={`rounded-lg p-3 text-xs font-semibold flex items-center gap-2 ${
                      configSaveStatus.startsWith("Success")
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30"
                        : "bg-red-500/15 text-red-800 dark:text-red-200 border border-red-500/30"
                    }`}
                  >
                    <Info className="h-4 w-4 shrink-0" />
                    {configSaveStatus}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 3: GUIDE & IP DIAGNOSTICS */}
          {activeTab === "guide" && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Server Public IP & Whitelisting
                </div>
                <p className="text-foreground/70 leading-relaxed">
                  Use this server IP when a carrier requires whitelisting or
                  reports Error 418:
                </p>
                <div className="flex items-center gap-2">
                  <code className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 font-mono text-sm font-bold text-foreground/70">
                    {status?.serverIp || "Unavailable"}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      status?.serverIp && handleCopyIp(status.serverIp)
                    }
                    disabled={!status?.serverIp}
                    className="h-8 text-xs font-semibold"
                  >
                    {copiedIp ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500 mr-1" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    {copiedIp ? "Copied!" : "Copy Server IP"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-foreground">Troubleshooting</h4>

                <details className="group rounded-lg border border-border/70 bg-background">
                  <summary className="cursor-pointer list-none px-3 py-2.5 font-semibold text-foreground">
                    Which provider should I use for simple SMS?
                  </summary>
                  <p className="border-t border-border/60 px-3 py-2.5 text-muted-foreground">
                    Use <strong>Fast2SMS</strong> with the Quick SMS route when
                    DLT registration is not required.
                  </p>
                </details>

                <details className="group rounded-lg border border-border/70 bg-background">
                  <summary className="cursor-pointer list-none px-3 py-2.5 font-semibold text-foreground">
                    How do I fix MSG91 Error 418?
                  </summary>
                  <p className="border-t border-border/60 px-3 py-2.5 text-muted-foreground">
                    Disable IP Restriction for the MSG91 AuthKey, or whitelist
                    the server IP shown above (
                    {status?.serverIp || "Unavailable"}).
                  </p>
                </details>

                <details className="group rounded-lg border border-border/70 bg-background">
                  <summary className="cursor-pointer list-none px-3 py-2.5 font-semibold text-foreground">
                    Are attendance alerts sent automatically?
                  </summary>
                  <p className="border-t border-border/60 px-3 py-2.5 text-muted-foreground">
                    Attendance alerts use the active provider and the parent
                    mobile number registered for the student.
                  </p>
                </details>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const SmsGatewayModal = Msg91SetupModal;
