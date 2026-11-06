import React, { useState, useRef } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
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
  Users,
  X,
} from "lucide-react";
import { localDb, isSupabaseConfigured } from "../lib/supabase";
import { provisionManagedAccount } from "../lib/accountService";
import { saveCredential } from "../lib/authUtils";
import {
  ParsedStudentRow,
  parseStudentSpreadsheet,
  downloadStudentExcelTemplate,
  downloadStudentCsvTemplate,
} from "../lib/studentExcelUtils";
import {
  sanitizeMobileInput,
  isValid10DigitMobile,
  getStudentValidationErrors,
} from "../lib/validation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Switch } from "./ui/switch";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { FileUploadSurface } from "./ui/file-upload-surface";

interface StudentImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId?: string;
  defaultSemester?: number;
  onImportComplete: (count: number) => void;
}

interface StudentImportProgress {
  current: number;
  total: number;
  studentName: string;
  phase: "creating_student" | "creating_account";
}

interface StudentImportResult {
  studentsCreated: number;
  accountsCreated: number;
  existingSkipped: number;
  failures: string[];
  failedRows: ParsedStudentRow[];
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  open,
  onOpenChange,
  departmentId,
  defaultSemester = 1,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedStudentRow[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "valid" | "existing" | "invalid">("all");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<StudentImportProgress | null>(null);
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Portal Account & Password Strategy
  const [createAccounts, setCreateAccounts] = useState(true);
  const [passwordMode, setPasswordMode] = useState<"enrollment" | "custom">("enrollment");
  const [customPassword, setCustomPassword] = useState("Student@123");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(departmentId || "");

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

  const closeImportModal = () => {
    if (isImporting) return;
    if (!importResult && rows.length > 0) {
      const discard = window.confirm("Discard the prepared student import and close this dialog?");
      if (!discard) return;
    }
    resetState();
    onOpenChange(false);
  };

  const retryFailedRows = () => {
    if (!importResult?.failedRows.length) return;
    setRows(importResult.failedRows);
    setActiveTab("all");
    setImportResult(null);
    setImportProgress(null);
  };

  const handleFileProcess = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setFileName(file.name);

    try {
      const parsedRows = await parseStudentSpreadsheet(file, defaultSemester);
      setRows(parsedRows);
    } catch (err: any) {
      setParseError(err.message || "Failed to process student spreadsheet.");
      setRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleCellChange = (index: number, field: keyof ParsedStudentRow, value: any) => {
    setRows((prev) => {
      const next = [...prev];
      const sanitizedValue =
        field === "parent_mobile" || field === "student_mobile"
          ? sanitizeMobileInput(String(value || ""))
          : value;

      const row = { ...next[index], [field]: sanitizedValue };

      // Re-validate row
      const errors: string[] = [];
      const warnings: string[] = [];

      errors.push(
        ...getStudentValidationErrors(row, [...localDb.students, ...next.slice(0, index)]),
      );

      row.errors = errors;
      row.warnings = warnings;
      row.isValid = errors.length === 0;
      next[index] = row;
      return next;
    });
  };

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const isAlreadyExistingError = (message: string) =>
    message.toLowerCase().includes("already exists");
  const isExistingRow = (row: ParsedStudentRow) =>
    !row.isValid && row.errors.length > 0 && row.errors.every(isAlreadyExistingError);

  const validRows = rows.filter((row) => row.isValid);
  const existingRows = rows.filter(isExistingRow);
  const invalidRows = rows.filter((row) => !row.isValid && !isExistingRow(row));

  const displayedRows =
    activeTab === "all"
      ? rows
      : activeTab === "valid"
        ? validRows
        : activeTab === "existing"
          ? existingRows
          : invalidRows;

  const validCount = validRows.length;
  const existingCount = existingRows.length;
  const invalidCount = invalidRows.length;

  const handleExecuteImport = async () => {
    if (validCount === 0) return;
    if (!selectedDepartmentId) {
      alert("A department is required before importing students.");
      return;
    }
    if (createAccounts && passwordMode === "custom" && customPassword.trim().length < 6) {
      alert("The custom initial password must be at least 6 characters long.");
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    let studentsCreated = 0;
    let accountsCreated = 0;
    const failures: string[] = [];
    const failedRows: ParsedStudentRow[] = [];

    for (let rowIndex = 0; rowIndex < validRows.length; rowIndex += 1) {
      const item = validRows[rowIndex];
      setImportProgress({
        current: rowIndex + 1,
        total: validRows.length,
        studentName: item.full_name,
        phase: "creating_student",
      });
      let insertedStudentId: string | null = null;
      try {
        const studentData = {
          roll_number: item.roll_number.trim(),
          prn_number: item.prn_number.trim(),
          reg_number: item.reg_number?.trim() || null,
          full_name: item.full_name.trim(),
          department_id: selectedDepartmentId,
          semester: item.semester || defaultSemester || 1,
          parent_name: item.parent_name?.trim() || null,
          parent_mobile: item.parent_mobile?.trim() || null,
          parent_email: item.parent_email?.trim().toLowerCase() || null,
          student_mobile: item.student_mobile?.trim() || null,
          email: item.email?.trim().toLowerCase() || null,
          date_of_birth: item.date_of_birth || null,
          gender: item.gender || null,
          address: item.address?.trim() || null,
          status: "active" as const,
        };
        const [student] = await localDb.insert("students", [studentData]);
        if (!student) throw new Error("Student record was not created.");
        insertedStudentId = student.id;
        studentsCreated += 1;

        if (createAccounts) {
          setImportProgress({
            current: rowIndex + 1,
            total: validRows.length,
            studentName: item.full_name,
            phase: "creating_account",
          });
          const effectiveEmail =
            item.email?.trim().toLowerCase() ||
            `${item.roll_number.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.college.edu`;
          const rawPassword =
            passwordMode === "enrollment" ? student.roll_number : customPassword.trim();
          const initialPassword = rawPassword.length >= 6 ? rawPassword : `${rawPassword}@123`;

          if (isSupabaseConfigured) {
            const provisioned = await provisionManagedAccount({
              email: effectiveEmail,
              password: initialPassword,
              fullName: student.full_name,
              role: "student",
              departmentId: selectedDepartmentId,
              studentId: student.id,
            });
            if (!provisioned.userId) {
              throw new Error("Account provisioning did not return a Supabase Auth user ID.");
            }
            accountsCreated += 1;
            await localDb.update("students", student.id, {
              user_id: provisioned.userId,
              email: effectiveEmail,
            });
          } else {
            // Local mode fallback
            const localUserId = `user-student-${student.id}`;
            await localDb.insert("users", [
              {
                id: localUserId,
                email: effectiveEmail,
                full_name: student.full_name,
                role: "student",
                student_id: student.id,
                department_id: selectedDepartmentId,
                roll_number: student.roll_number,
              },
            ]);
            saveCredential([student.roll_number, effectiveEmail], initialPassword);
            accountsCreated += 1;
            await localDb.update("students", student.id, {
              user_id: localUserId,
              email: effectiveEmail,
            });
          }
        }
      } catch (error) {
        if (insertedStudentId) {
          await localDb.delete("students", insertedStudentId);
          studentsCreated -= 1;
        }
        failures.push(
          `${item.full_name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        failedRows.push(item);
      }
    }

    setIsImporting(false);
    setImportProgress(null);
    if (studentsCreated > 0) onImportComplete(studentsCreated);
    setImportResult({
      studentsCreated,
      accountsCreated,
      existingSkipped: existingCount,
      failures,
      failedRows,
    });
    window.setTimeout(
      () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      0,
    );
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeImportModal())}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (isImporting) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isImporting) event.preventDefault();
        }}
        className="w-[min(960px,calc(100vw-2rem))] max-w-none max-h-[86vh] overflow-hidden rounded-2xl border-border/70 bg-card p-0 shadow-2xl flex flex-col"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Class Roster & Enrollment Ingestion
              </p>
              <DialogTitle className="mt-1 max-w-2xl text-xl font-bold leading-tight tracking-tight font-display">
                Import Multiple Students (Excel / CSV)
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
            >
              Semester {defaultSemester} Roster
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 px-4 pb-6 pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              Import students in three simple steps:
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1">1. Select department</span>
            <span className="rounded-full bg-muted px-2.5 py-1">2. Upload spreadsheet</span>
            <span className="rounded-full bg-muted px-2.5 py-1">3. Review and import</span>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/10 p-3 shadow-sm">
            <label
              htmlFor="student-import-department"
              className="mb-2 block text-sm font-semibold text-foreground"
            >
              Department <span className="text-destructive">*</span>
            </label>
            <Select
              id="student-import-department"
              value={selectedDepartmentId}
              onValueChange={setSelectedDepartmentId}
              disabled={isImporting || Boolean(departmentId)}
              searchable
              searchPlaceholder="Search departments..."
              emptyMessage="No matching department"
              placeholder="Select Department"
              options={[
                { value: "", label: "Select Department" },
                ...localDb.departments
                  .filter((department) => department.status !== "inactive")
                  .map((department) => ({
                    value: department.id,
                    label: department.name,
                    description: department.code,
                    searchText: `${department.name} ${department.code}`,
                  })),
              ]}
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Every imported student and generated portal account will be assigned to this
              department.
            </p>
          </div>
          {(isImporting || importResult) && (
            <div
              ref={resultRef}
              role="status"
              aria-live="polite"
              className="rounded-xl border border-primary/30 bg-primary/5 p-4"
            >
              {isImporting && importProgress ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {importProgress.phase === "creating_account"
                          ? "Creating portal account"
                          : "Creating student record"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {importProgress.studentName} • {importProgress.current} of{" "}
                        {importProgress.total}
                      </p>
                    </div>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The import continues if another browser tab is selected. Keep this page open
                    until completion.
                  </p>
                </div>
              ) : importResult ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-semibold">Import completed</p>
                      <p className="text-xs text-muted-foreground">
                        The result remains here until Done is selected.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
                    <div className="rounded-lg border p-2">
                      <p className="text-lg font-bold">{importResult.studentsCreated}</p>
                      <p>Students</p>
                    </div>
                    <div className="rounded-lg border p-2">
                      <p className="text-lg font-bold">{importResult.accountsCreated}</p>
                      <p>Accounts</p>
                    </div>
                    <div className="rounded-lg border p-2">
                      <p className="text-lg font-bold">{importResult.existingSkipped}</p>
                      <p>Already existed</p>
                    </div>
                    <div className="rounded-lg border p-2">
                      <p className="text-lg font-bold">{importResult.failures.length}</p>
                      <p>Failed</p>
                    </div>
                  </div>
                  {importResult.failures.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-lg border border-destructive/30 p-2 text-xs text-destructive">
                      {importResult.failures.map((failure) => (
                        <p key={failure}>• {failure}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Format Specification Banner */}
          <div className="rounded-xl border border-border/70 bg-muted/10 p-3 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-primary" />
                Download a template and prepare student data
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadStudentExcelTemplate(defaultSemester)}
                  className="h-7 text-xs bg-card"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Excel Template (.xlsx)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadStudentCsvTemplate(defaultSemester)}
                  className="h-7 text-xs bg-card"
                >
                  <Download className="h-3.5 w-3.5 mr-1 text-primary" />
                  CSV Template (.csv)
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground pt-1">
              <div>
                <span className="font-medium text-foreground">Mandatory:</span>{" "}
                <span className="font-semibold text-primary">Enrollment No / Roll No</span> (Unique
                key used as default portal password),{" "}
                <span className="font-semibold text-primary">Student Full Name</span> and{" "}
                <span className="font-semibold text-primary">Parent Mobile</span> (For automated SMS
                alerts).
              </div>
              <div>
                <span className="font-medium text-foreground">Optional:</span> Semester, Parent
                Name, Student Mobile, Student Email, Gender, Address.
              </div>
            </div>
          </div>

          <FileUploadSurface
            inputRef={fileInputRef}
            accept=".xlsx,.xls,.csv,.tsv"
            formats={[".xlsx", ".xls", ".csv", ".tsv"]}
            title="Click to upload or drag and drop student spreadsheet"
            description="Microsoft Excel, CSV, and TSV files are supported"
            fileName={fileName}
            busy={isParsing}
            disabled={isImporting}
            error={parseError}
            onFile={handleFileProcess}
            onClear={resetState}
          />

          {/* Account Creation & Password Configuration Settings */}
          <div className="rounded-xl border border-border/70 bg-muted/10 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Switch
                  checked={createAccounts}
                  onCheckedChange={setCreateAccounts}
                  aria-label="Create portal accounts automatically"
                />
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  Create student portal accounts automatically
                </span>
              </div>
              {createAccounts && (
                <span className="text-[11px] text-muted-foreground">
                  Students will use Enrollment Number or Email to sign in
                </span>
              )}
            </div>

            {createAccounts && (
              <div className="pt-2 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    Initial password strategy
                  </p>
                  <RadioGroup
                    value={passwordMode}
                    onValueChange={(value) => setPasswordMode(value as "enrollment" | "custom")}
                    className="space-y-1.5"
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                      <RadioGroupItem value="enrollment" />
                      <span className="font-medium">
                        Unique Enrollment / Roll Number{" "}
                        <span className="text-muted-foreground font-normal">
                          (Default & Recommended)
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                      <RadioGroupItem value="custom" />
                      <span className="font-medium">
                        Set Custom Initial Password for this import batch
                      </span>
                    </label>
                  </RadioGroup>
                </div>

                <div>
                  {passwordMode === "enrollment" ? (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Enrollment Number as Password:
                      </span>
                      Each student’s portal account will be initially protected by their own unique
                      Roll/Enrollment number (e.g.{" "}
                      <code className="font-bold text-foreground font-mono">21CS101</code>
                      ). They will be prompted to change it upon first login.
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
                        placeholder="e.g. Student@123"
                        className="h-8 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        All imported students will initially use this password to sign in.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Table Preview and Tab Filters */}
          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant={activeTab === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("all")}
                    className={`h-7 text-xs ${
                      activeTab === "all"
                        ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                        : ""
                    }`}
                  >
                    All Students ({rows.length})
                  </Button>
                  <Button
                    variant={activeTab === "valid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("valid")}
                    className={`h-7 text-xs text-emerald-600 dark:text-emerald-400 ${
                      activeTab === "valid"
                        ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15"
                        : ""
                    }`}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Ready to Import ({validCount})
                  </Button>
                  {existingCount > 0 && (
                    <Button
                      variant={activeTab === "existing" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("existing")}
                      className={`h-7 text-xs text-amber-600 dark:text-amber-400 ${
                        activeTab === "existing"
                          ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15"
                          : ""
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Already exists ({existingCount})
                    </Button>
                  )}
                  {invalidCount > 0 && (
                    <Button
                      variant={activeTab === "invalid" ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("invalid")}
                      className={`h-7 text-xs ${
                        activeTab === "invalid"
                          ? "border-destructive/30 bg-destructive/10 hover:bg-destructive/15"
                          : ""
                      }`}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Invalid ({invalidCount})
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Showing {displayedRows.length} row
                  {displayedRows.length !== 1 ? "s" : ""} • Click any cell to edit
                </p>
              </div>

              {/* Data Table */}
              <div className="rounded-xl border border-border/70 overflow-x-auto max-h-72 shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-card sticky top-0 z-30 border-b border-border shadow-sm">
                    <tr>
                      <th className="py-2 px-2.5 font-semibold text-muted-foreground w-10">#</th>
                      <th className="py-2 px-2.5 font-semibold text-foreground">Status</th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[130px]">
                        Enrollment / Roll No*
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[160px]">
                        Student Full Name*
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[130px]">
                        Parent Mobile*
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[120px]">
                        Student Mobile
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[150px]">
                        Email
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[70px]">
                        Sem
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[110px]">
                        Default Password
                      </th>
                      <th className="py-2 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {displayedRows.map((row, displayIndex) => {
                      const originalIndex = rows.findIndex((r) => r.rowNumber === row.rowNumber);
                      const expectedPassword =
                        passwordMode === "enrollment"
                          ? row.roll_number || "—"
                          : customPassword || "—";

                      return (
                        <tr
                          key={row.rowNumber}
                          className={
                            isExistingRow(row)
                              ? "bg-amber-500/5 hover:bg-amber-500/10"
                              : !row.isValid
                                ? "bg-destructive/5 hover:bg-destructive/10"
                                : "hover:bg-muted/30"
                          }
                        >
                          <td className="py-1.5 px-2.5 text-muted-foreground font-mono">
                            {displayIndex + 1}
                          </td>

                          {/* Status Badge & Tooltip */}
                          <td className="py-1.5 px-2.5">
                            {row.isValid ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                              >
                                Ready
                              </Badge>
                            ) : isExistingRow(row) ? (
                              <span title={row.errors.join("; ")}>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                >
                                  Already exists
                                </Badge>
                              </span>
                            ) : (
                              <div className="min-w-[170px] space-y-1">
                                <Badge variant="destructive" className="text-[10px]">
                                  Invalid
                                </Badge>
                                <p className="text-[10px] leading-4 text-destructive">
                                  {row.errors.join(" ")}
                                </p>
                              </div>
                            )}
                          </td>

                          {/* Enrollment / Roll Number */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.roll_number}
                              onChange={(e) =>
                                handleCellChange(originalIndex, "roll_number", e.target.value)
                              }
                              placeholder="e.g. 21CS101"
                              className={`h-7 text-xs font-mono font-bold px-2 ${
                                !row.roll_number.trim()
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : ""
                              }`}
                            />
                            {row.errors.some((e) => e.includes("Enrollment")) && (
                              <p className="text-[10px] text-destructive mt-0.5">
                                {row.errors.find((e) => e.includes("Enrollment"))}
                              </p>
                            )}
                          </td>

                          {/* Full Name */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.full_name}
                              onChange={(e) =>
                                handleCellChange(originalIndex, "full_name", e.target.value)
                              }
                              placeholder="Full Name"
                              className="h-7 text-xs px-2"
                            />
                          </td>

                          {/* Parent Mobile (Mandatory 10 digits) */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.parent_mobile}
                              maxLength={10}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              onChange={(e) =>
                                handleCellChange(originalIndex, "parent_mobile", e.target.value)
                              }
                              placeholder="10 Digits"
                              className={`h-7 text-xs font-mono px-2 ${
                                !isValid10DigitMobile(row.parent_mobile)
                                  ? "border-destructive focus-visible:ring-destructive bg-destructive/10"
                                  : "border-emerald-500/50 bg-emerald-500/5"
                              }`}
                              title={
                                !isValid10DigitMobile(row.parent_mobile)
                                  ? "Must be exactly 10 digits starting with 6-9"
                                  : "Valid 10-digit mobile"
                              }
                            />
                          </td>

                          {/* Student Mobile (Optional 10 digits) */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.student_mobile}
                              maxLength={10}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              onChange={(e) =>
                                handleCellChange(originalIndex, "student_mobile", e.target.value)
                              }
                              placeholder="10 Digits (Opt)"
                              className={`h-7 text-xs font-mono px-2 ${
                                row.student_mobile && !isValid10DigitMobile(row.student_mobile)
                                  ? "border-destructive focus-visible:ring-destructive bg-destructive/10"
                                  : ""
                              }`}
                              title={
                                row.student_mobile && !isValid10DigitMobile(row.student_mobile)
                                  ? "Must be exactly 10 digits if provided"
                                  : ""
                              }
                            />
                          </td>

                          {/* Email */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.email}
                              onChange={(e) =>
                                handleCellChange(originalIndex, "email", e.target.value)
                              }
                              placeholder="Auto-generated if empty"
                              className="h-7 text-xs px-2"
                            />
                          </td>

                          {/* Semester */}
                          <td className="py-1.5 px-2">
                            <Input
                              type="number"
                              value={row.semester}
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "semester",
                                  parseInt(e.target.value, 10) || defaultSemester,
                                )
                              }
                              className="h-7 text-xs px-1 w-14 text-center font-mono"
                            />
                          </td>

                          {/* Default Password Preview */}
                          <td className="py-1.5 px-2">
                            <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border block text-center truncate">
                              {expectedPassword}
                            </span>
                          </td>

                          {/* Delete Row */}
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(originalIndex)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              title="Remove row"
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
                  Tip: You can edit roll numbers, names, and phone numbers directly in the table
                  before importing.
                </span>
                {createAccounts && (
                  <span>
                    Initial Password:{" "}
                    <span className="font-mono font-bold text-foreground">
                      {passwordMode === "enrollment"
                        ? "Student's Unique Enrollment Number"
                        : customPassword}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Controls */}
        <div className="shrink-0 flex flex-col-reverse gap-3 border-t border-border/60 bg-card/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          {!importResult && (
            <Button variant="outline" size="sm" onClick={closeImportModal} disabled={isImporting}>
              Cancel
            </Button>
          )}
          <div className="flex items-center gap-2 justify-end sm:ml-auto">
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
                className="bg-primary text-primary-foreground font-medium shadow-xs"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing {importProgress?.current || 0} of {validCount}...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Confirm & Import {validCount} Student{validCount !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
