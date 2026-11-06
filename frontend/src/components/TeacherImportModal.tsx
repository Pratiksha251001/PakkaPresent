import React, { useState, useRef } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  KeyRound,
  Loader2,
  Lock,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { Department } from "../lib/types";
import { localDb, isSupabaseConfigured } from "../lib/supabase";
import { provisionManagedAccount } from "../lib/accountService";
import { saveCredential } from "../lib/authUtils";
import {
  ParsedTeacherRow,
  parseTeacherSpreadsheet,
  downloadTeacherExcelTemplate,
  downloadTeacherCsvTemplate,
} from "../lib/teacherExcelUtils";
import {
  sanitizeMobileInput,
  getMobileValidationError,
  isValid10DigitMobile,
  isValidEmail,
  getEmployeeIdValidationError,
} from "../lib/validation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

interface TeacherImportProgress {
  current: number;
  total: number;
  teacherName: string;
  phase: "creating_teacher" | "creating_account";
}

interface TeacherImportResult {
  teachersCreated: number;
  accountsCreated: number;
  existingSkipped: number;
  failures: string[];
  failedRows: ParsedTeacherRow[];
}

interface TeacherImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department;
  onImportComplete: (count: number) => void;
}

export const TeacherImportModal: React.FC<TeacherImportModalProps> = ({
  open,
  onOpenChange,
  department,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const departments = localDb.departments;
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    department?.id || departments[0]?.id || "dept-1",
  );
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedTeacherRow[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "valid" | "errors">("all");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<TeacherImportProgress | null>(null);
  const [importResult, setImportResult] = useState<TeacherImportResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [createAccounts, setCreateAccounts] = useState(true);
  const [passwordMode, setPasswordMode] = useState<"empid" | "custom">("empid");
  const [customPassword, setCustomPassword] = useState("Teacher@123");
  const [showGuidelines, setShowGuidelines] = useState(false);

  const resetState = () => {
    setFileName(null);
    setParseError(null);
    setRows([]);
    setActiveTab("all");
    setIsParsing(false);
    setIsImporting(false);
    setImportProgress(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileProcess = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setFileName(file.name);

    try {
      const parsedRows = await parseTeacherSpreadsheet(
        file,
        department?.name || "Department Faculty",
      );
      setRows(parsedRows);
    } catch (err: any) {
      setParseError(err.message || "Failed to process spreadsheet file.");
      setRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleCellChange = (index: number, field: keyof ParsedTeacherRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      const sanitizedValue = field === "mobile" ? sanitizeMobileInput(value) : value;
      const row = { ...next[index], [field]: sanitizedValue };

      // Re-validate row
      const errors: string[] = [];
      if (!row.full_name.trim()) errors.push("Teacher Full Name is required");
      if (!row.employee_id.trim()) {
        errors.push("College Employee ID Reference No is required");
      } else {
        const empErr = getEmployeeIdValidationError(row.employee_id);
        if (empErr) {
          errors.push(empErr);
        }
        const normEmp = row.employee_id.trim().toLowerCase();
        const existingEmp = localDb.teachers.find(
          (t) => t.employee_id.trim().toLowerCase() === normEmp,
        );
        if (existingEmp) {
          errors.push(`Employee ID "${row.employee_id}" already exists in system`);
        }
      }

      // 10-Digit Mobile Validation
      if (row.mobile) {
        const mobileErr = getMobileValidationError(row.mobile, "Mobile number", false);
        if (mobileErr) {
          errors.push(mobileErr);
        }
      }

      // Email Validation - Strictly Mandatory (*)
      if (!row.email || !row.email.trim()) {
        errors.push("Email address is strictly required (*)");
      } else if (!isValidEmail(row.email.trim())) {
        errors.push(`Invalid email format "${row.email.trim()}"`);
      }

      row.errors = errors;
      row.isValid = errors.length === 0;
      next[index] = row;
      return next;
    });
  };

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const isExistingTeacherRow = (row: ParsedTeacherRow) =>
    !row.isValid &&
    row.errors.length > 0 &&
    row.errors.every((message) => message.toLowerCase().includes("already exists"));
  const validRows = rows.filter((row) => row.isValid);
  const existingRows = rows.filter(isExistingTeacherRow);
  const invalidRows = rows.filter((row) => !row.isValid && !isExistingTeacherRow(row));
  const validCount = validRows.length;
  const existingCount = existingRows.length;
  const invalidCount = invalidRows.length;
  const filteredRows = rows.filter((row) => {
    if (activeTab === "valid") return row.isValid;
    if (activeTab === "errors") return !row.isValid;
    return true;
  });

  const handleExecuteImport = async () => {
    if (validRows.length === 0) {
      setParseError("No valid teacher records are available to import.");
      return;
    }
    if (createAccounts && passwordMode === "custom" && customPassword.trim().length < 6) {
      setParseError("The custom initial password must be at least 6 characters long.");
      return;
    }

    setIsImporting(true);
    setParseError(null);
    setImportResult(null);
    let teachersCreated = 0;
    let accountsCreated = 0;
    const failures: string[] = [];
    const failedRows: ParsedTeacherRow[] = [];

    for (let rowIndex = 0; rowIndex < validRows.length; rowIndex += 1) {
      const item = validRows[rowIndex];
      setImportProgress({
        current: rowIndex + 1,
        total: validRows.length,
        teacherName: item.full_name,
        phase: "creating_teacher",
      });
      let insertedTeacherId: string | null = null;
      try {
        const isCoordinator = item.role === "class_coordinator";
        const rowDept = (item.department || "").trim().toLowerCase();
        const matchedDept = departments.find(
          (candidate) =>
            candidate.name.toLowerCase() === rowDept ||
            candidate.code.toLowerCase() === rowDept ||
            candidate.id.toLowerCase() === rowDept,
        );
        const departmentId =
          department?.id || matchedDept?.id || selectedDeptId || departments[0]?.id;
        if (!departmentId) {
          throw new Error("A verified department is required.");
        }

        const initialPassword =
          passwordMode === "empid" ? item.employee_id.trim() : customPassword.trim();
        const [teacher] = await localDb.insert("teachers", [
          {
            employee_id: item.employee_id.trim(),
            full_name: item.full_name.trim(),
            email: item.email.trim().toLowerCase(),
            mobile: item.mobile.trim() || null,
            designation: item.designation.trim() || "Assistant Professor",
            department_id: departmentId,
            qualification: item.qualification.trim() || null,
            date_of_birth: null,
            experience_years: item.experience_years.trim() || null,
            role: item.role,
            is_class_coordinator: isCoordinator,
            password: initialPassword,
            status: "active" as const,
          },
        ]);
        if (!teacher) throw new Error("Teacher record was not created.");
        insertedTeacherId = teacher.id;
        teachersCreated += 1;

        if (createAccounts) {
          setImportProgress({
            current: rowIndex + 1,
            total: validRows.length,
            teacherName: item.full_name,
            phase: "creating_account",
          });
          const effectiveEmail = item.email.trim().toLowerCase();
          if (isSupabaseConfigured) {
            const provisioned = await provisionManagedAccount({
              email: effectiveEmail,
              password: initialPassword,
              fullName: teacher.full_name,
              role: isCoordinator ? "class_coordinator" : "teacher",
              departmentId,
              teacherId: teacher.id,
            });
            if (!provisioned.userId) {
              throw new Error("Account provisioning did not return a Supabase Auth user ID.");
            }
            await localDb.update("teachers", teacher.id, {
              user_id: provisioned.userId,
              email: effectiveEmail,
            });
          } else {
            const localUserId = `teacher-user-${teacher.id}`;
            await localDb.insert("users", [
              {
                id: localUserId,
                full_name: teacher.full_name,
                email: effectiveEmail,
                role: isCoordinator ? "class_coordinator" : "teacher",
                department_id: departmentId,
                teacher_id: teacher.id,
                employee_id: teacher.employee_id,
                status: "active",
              },
            ]);
            await localDb.update("teachers", teacher.id, { user_id: localUserId });
            saveCredential(
              [localUserId, teacher.id, teacher.employee_id, effectiveEmail],
              initialPassword,
            );
          }
          accountsCreated += 1;
        }
      } catch (error) {
        if (insertedTeacherId) {
          await localDb.delete("teachers", insertedTeacherId);
          teachersCreated -= 1;
        }
        failures.push(
          `${item.full_name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        failedRows.push(item);
      }
    }

    setImportProgress(null);
    setIsImporting(false);
    setImportResult({
      teachersCreated,
      accountsCreated,
      existingSkipped: existingCount,
      failures,
      failedRows,
    });
    if (teachersCreated > 0) onImportComplete(teachersCreated);
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  const retryFailedRows = () => {
    if (!importResult?.failedRows.length) return;
    setRows(importResult.failedRows);
    setActiveTab("all");
    setImportResult(null);
    setImportProgress(null);
  };

  const closeImportModal = () => {
    if (isImporting) return;
    if (!importResult && rows.length > 0) {
      const discard = window.confirm("Discard the prepared teacher import and close this dialog?");
      if (!discard) return;
    }
    resetState();
    onOpenChange(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen || !isImporting) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (isImporting) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isImporting) event.preventDefault();
        }}
        className="w-[min(1000px,calc(100vw-2rem))] max-w-none max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Bulk Faculty Management
              </p>
              <DialogTitle className="text-lg sm:text-xl font-bold font-display mt-0.5">
                Import Multiple Teachers (Excel / CSV)
              </DialogTitle>
            </div>
            {department && (
              <Badge variant="outline" className="text-xs w-fit">
                {department.name}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 pr-8 [scrollbar-width:thin] sm:px-8 sm:py-6 sm:pr-10">
          {/* Quick Template Download & Guidelines Toggle Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-border/70 bg-muted/20 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-medium text-foreground">Need standard template?</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTeacherExcelTemplate(department?.name)}
                className="h-7 text-xs bg-background hover:bg-muted"
              >
                <Download className="h-3 w-3 mr-1 text-emerald-600" />
                Excel (.xlsx)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTeacherCsvTemplate(department?.name)}
                className="h-7 text-xs bg-background hover:bg-muted"
              >
                <Download className="h-3 w-3 mr-1 text-primary" />
                CSV (.csv)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGuidelines(!showGuidelines)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="h-3.5 w-3.5 mr-1 text-primary" />
                {showGuidelines ? "Hide Columns" : "View Columns"}
                {showGuidelines ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
            </div>
          </div>

          {/* Collapsible Format Details Specification */}
          {showGuidelines && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3.5 text-xs space-y-2 animate-in fade-in duration-200">
              <p className="text-muted-foreground text-[11px]">
                Spreadsheet columns (* indicates strictly required field):
              </p>
              <div className="grid grid-cols-1 gap-3 pt-1 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
                <div className="min-w-0 rounded-lg border border-border/60 bg-background p-3">
                  <p className="font-bold text-foreground">Full Name *</p>
                  <p className="text-muted-foreground text-[10px]">Required identifier</p>
                </div>
                <div className="min-w-0 rounded-lg border border-border/60 bg-background p-3">
                  <p className="font-bold text-foreground">College Emp ID *</p>
                  <p className="text-muted-foreground text-[10px]">e.g. EMP-101</p>
                </div>
                <div className="min-w-0 rounded-lg border border-border/60 bg-background p-3">
                  <p className="font-bold text-foreground text-primary">Email Address *</p>
                  <p className="text-muted-foreground text-[10px]">teacher@college.edu</p>
                </div>
                <div className="min-w-0 rounded-lg border border-border/60 bg-background p-3">
                  <p className="font-bold text-foreground">Department</p>
                  <p className="text-muted-foreground text-[10px]">Auto-matched</p>
                </div>
                <div className="min-w-0 rounded-lg border border-border/60 bg-background p-3">
                  <p className="font-bold text-foreground">Designation</p>
                  <p className="text-muted-foreground text-[10px]">Prof / Asst Prof</p>
                </div>
                <div className="min-w-0 rounded-lg border border-border/60 bg-background p-3">
                  <p className="font-bold text-foreground">Qualification</p>
                  <p className="text-muted-foreground text-[10px]">Ph.D, M.Tech, etc</p>
                </div>
                <div className="min-w-0 rounded-lg border border-border/60 bg-background p-3">
                  <p className="font-bold text-foreground">Experience</p>
                  <p className="text-muted-foreground text-[10px]">Years (Optional)</p>
                </div>
                <div className="min-w-0 rounded-lg border border-border/60 bg-background p-3">
                  <p className="font-bold text-foreground">Phone</p>
                  <p className="text-muted-foreground text-[10px]">10 digits (Optional)</p>
                </div>
              </div>
            </div>
          )}

          {/* Prominent Upload Dropzone - Immediately Visible */}
          {rows.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-primary bg-primary/10 scale-[0.99]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex flex-col items-center justify-center space-y-2.5">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  {isParsing ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>

                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {isParsing
                      ? "Analyzing spreadsheet and validating rows..."
                      : "Drag & drop your Excel or CSV file here, or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)
                  </p>
                </div>

                <div className="flex gap-1.5 pt-1">
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                    .xlsx
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                    .xls
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                    .csv
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            /* File loaded bar */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{fileName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {rows.length} rows · {validCount} valid · {invalidCount} issues
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetState}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Choose Different File
                </Button>
              </div>
            </div>
          )}

          {/* Department Selection for College-wide Admin Import (Compact) */}
          {!department && departments.length > 0 && rows.length === 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/20 rounded-xl border border-border/70 text-xs">
              <span className="font-semibold text-foreground">Fallback Department:</span>
              <Select
                value={selectedDeptId}
                onValueChange={setSelectedDeptId}
                searchable
                searchPlaceholder="Search departments..."
                emptyMessage="No matching department"
                className="w-full sm:w-auto sm:min-w-[240px]"
                options={departments.map((department) => ({
                  value: department.id,
                  label: department.name,
                  description: department.code,
                  searchText: `${department.name} ${department.code}`,
                }))}
              />
            </div>
          )}

          {/* Parse Error Alert */}
          {parseError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error reading file</p>
                <p className="mt-0.5">{parseError}</p>
              </div>
            </div>
          )}

          {/* Account Creation & Password Configuration Settings */}
          <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={createAccounts}
                  onChange={(e) => setCreateAccounts(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  Automatically generate faculty portal accounts upon import
                </span>
              </label>
              {createAccounts && (
                <span className="text-[11px] text-muted-foreground">
                  Faculty will use College Employee ID or Email to sign in
                </span>
              )}
            </div>

            {createAccounts && (
              <div className="grid grid-cols-1 gap-5 border-t border-border/50 pt-3 text-xs lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    Default Faculty Initial Password Strategy:
                  </p>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="teacherPwdMode"
                        checked={passwordMode === "empid"}
                        onChange={() => setPasswordMode("empid")}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="font-medium">
                        Unique College Employee ID Ref No{" "}
                        <span className="text-muted-foreground font-normal">
                          (Default & Recommended)
                        </span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="teacherPwdMode"
                        checked={passwordMode === "custom"}
                        onChange={() => setPasswordMode("custom")}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="font-medium">
                        Set Custom Password for all imported faculty
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  {passwordMode === "empid" ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Employee ID as Default Password:
                      </span>
                      Each teacher’s portal account will initially use their assigned Employee ID
                      Ref No (e.g.{" "}
                      <code className="font-bold text-foreground font-mono">EMP-CSE-01</code>
                      ). They will be prompted to set a private password on first login.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-foreground block">
                        Custom Batch Password:
                      </label>
                      <Input
                        type="text"
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        placeholder="e.g. Teacher@123"
                        className="h-8 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        All imported teachers will initially use this password to sign in.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {(isImporting && importProgress) || importResult ? (
            <div
              ref={resultRef}
              role="status"
              aria-live="polite"
              className="rounded-xl border border-primary/30 bg-primary/5 p-4"
            >
              {isImporting && importProgress ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {importProgress.phase === "creating_account"
                          ? "Creating faculty portal account"
                          : `Creating teacher ${importProgress.current} of ${importProgress.total}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{importProgress.teacherName}</p>
                    </div>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.round(
                          (importProgress.current / importProgress.total) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : importResult ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-semibold text-foreground">Import completed</p>
                      <p className="text-xs text-muted-foreground">
                        Review the results, then select Done.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
                    <div className="rounded-lg border bg-card p-2">
                      <p className="text-lg font-bold">{importResult.teachersCreated}</p>
                      <p>Teachers</p>
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <p className="text-lg font-bold">{importResult.accountsCreated}</p>
                      <p>Accounts</p>
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <p className="text-lg font-bold">{importResult.existingSkipped}</p>
                      <p>Existing</p>
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <p className="text-lg font-bold">{importResult.failures.length}</p>
                      <p>Failed</p>
                    </div>
                  </div>
                  {importResult.failures.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">
                      {importResult.failures.map((failure) => (
                        <p key={failure}>{failure}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Interactive Preview Table */}
          {rows.length > 0 && !importResult && (
            <div className="space-y-3">
              {/* Tab Filters & Options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      activeTab === "all"
                        ? "bg-primary/10 text-primary shadow-xs border border-primary/25"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Rows ({rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("valid")}
                    className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                      activeTab === "valid"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-500/25"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Valid ({validCount})
                  </button>
                  {invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("errors")}
                      className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                        activeTab === "errors"
                          ? "bg-destructive/10 text-destructive shadow-xs border border-destructive/25"
                          : "text-destructive/80 hover:text-destructive"
                      }`}
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      Attention Needed ({invalidCount})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={createAccounts}
                      onChange={(e) => setCreateAccounts(e.target.checked)}
                      className="rounded border-border text-primary"
                    />
                    <span>Auto-create Login Accounts</span>
                  </label>
                </div>
              </div>

              {/* Mandatory Fields Notice */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-foreground">
                <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[11px]">
                  Strict Validation Rule
                </span>
                <span className="text-muted-foreground">
                  Strictly Mandatory: <strong className="text-foreground">Full Name *</strong>,{" "}
                  <strong className="text-foreground">College Emp ID *</strong>, and{" "}
                  <strong className="text-foreground">Email Address *</strong>. Other fields
                  (Designation, Qualification, Experience, Phone) remain optional.
                </span>
              </div>

              {/* Editable Spreadsheet Table Container */}
              <div className="border border-border rounded-xl overflow-hidden overflow-x-auto max-h-[380px]">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 z-30 border-b border-border bg-card text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Full Name *</th>
                      <th className="py-2.5 px-3 min-w-[130px]">College Emp ID *</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Email *</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Designation (Opt)</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Qualification (Opt)</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Experience (Opt)</th>
                      <th className="py-2.5 px-3 min-w-[120px]">Phone (Opt)</th>
                      <th className="py-2.5 px-3 w-12 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRows.map((row, idx) => {
                      const originalIndex = rows.findIndex((r) => r.rowNumber === row.rowNumber);
                      return (
                        <tr
                          key={row.rowNumber}
                          className={`hover:bg-muted/30 transition-colors ${
                            !row.isValid ? "bg-destructive/5" : ""
                          }`}
                        >
                          <td className="py-2 px-2 text-center font-mono text-[11px]">
                            {row.isValid ? (
                              <span className="text-emerald-500 font-bold">✓</span>
                            ) : (
                              <span
                                className="text-destructive font-bold cursor-help"
                                title={row.errors.join(", ")}
                              >
                                !
                              </span>
                            )}
                          </td>

                          {/* Full Name */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.full_name}
                              onChange={(e) =>
                                handleCellChange(originalIndex, "full_name", e.target.value)
                              }
                              placeholder="Required full name (*)"
                              className={`h-7 text-xs px-2 ${
                                !row.full_name.trim()
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : ""
                              }`}
                            />
                          </td>

                          {/* College Employee ID Reference No */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.employee_id}
                              onChange={(e) =>
                                handleCellChange(originalIndex, "employee_id", e.target.value)
                              }
                              placeholder="e.g. EMP-105 (*)"
                              className={`h-7 text-xs px-2 font-mono ${
                                !row.employee_id.trim() ||
                                row.errors.some((e) => e.includes("Employee ID"))
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : ""
                              }`}
                            />
                          </td>

                          {/* Email Address - MANDATORY */}
                          <td className="py-1.5 px-2">
                            <Input
                              type="email"
                              value={row.email}
                              onChange={(e) =>
                                handleCellChange(originalIndex, "email", e.target.value)
                              }
                              placeholder="teacher@college.edu (*)"
                              className={`h-7 text-xs px-2 ${
                                !row.email.trim() ||
                                row.errors.some((e) => e.toLowerCase().includes("email"))
                                  ? "border-destructive focus-visible:ring-destructive bg-destructive/5"
                                  : ""
                              }`}
                            />
                          </td>

                          {/* Designation */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.designation}
                              onChange={(e) =>
                                handleCellChange(originalIndex, "designation", e.target.value)
                              }
                              placeholder="Asst Professor"
                              className="h-7 text-xs px-2"
                            />
                          </td>

                          {/* Qualification */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.qualification}
                              onChange={(e) =>
                                handleCellChange(originalIndex, "qualification", e.target.value)
                              }
                              placeholder="e.g. Ph.D, M.Tech"
                              className="h-7 text-xs px-2"
                            />
                          </td>

                          {/* Year of Experience */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.experience_years}
                              onChange={(e) =>
                                handleCellChange(originalIndex, "experience_years", e.target.value)
                              }
                              placeholder="e.g. 5 Years"
                              className="h-7 text-xs px-2"
                            />
                          </td>

                          {/* Phone / Mobile (Optional 10 digits) */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.mobile}
                              maxLength={10}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              onChange={(e) =>
                                handleCellChange(originalIndex, "mobile", e.target.value)
                              }
                              placeholder="10 Digits (Opt)"
                              className={`h-7 text-xs px-2 font-mono ${
                                row.mobile && !isValid10DigitMobile(row.mobile)
                                  ? "border-destructive focus-visible:ring-destructive bg-destructive/10"
                                  : ""
                              }`}
                              title={
                                row.mobile && !isValid10DigitMobile(row.mobile)
                                  ? "Must be exactly 10 digits if provided"
                                  : ""
                              }
                            />
                          </td>

                          {/* Delete Action */}
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(originalIndex)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Status footer with row remarks */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>
                  Tip: You can correct any cell directly in the table before completing the import.
                </span>
                {createAccounts && (
                  <span>
                    Default login password will be set to:{" "}
                    <span className="font-mono font-bold text-foreground">
                      {passwordMode === "empid" ? "Faculty Employee ID" : customPassword}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Controls */}
        <div className="shrink-0 border-t border-border/60 bg-card px-6 py-4 sm:px-8">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!importResult && (
              <Button variant="outline" size="sm" onClick={closeImportModal} disabled={isImporting}>
                Cancel
              </Button>
            )}
            <div className="flex items-center justify-end gap-2 sm:ml-auto">
              {importResult?.failedRows.length ? (
                <Button variant="outline" size="sm" onClick={retryFailedRows}>
                  Retry failed rows
                </Button>
              ) : null}
              {importResult ? (
                <Button size="sm" onClick={closeImportModal}>
                  Done
                </Button>
              ) : rows.length > 0 ? (
                <Button
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={validCount === 0 || isImporting}
                  className="bg-primary font-medium text-primary-foreground shadow-xs disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing {importProgress?.current || 0} of {validCount}...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Confirm & Import {validCount} Teacher{validCount !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
