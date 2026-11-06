import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  School,
  Building,
  Check,
  Calendar,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { localDb } from "../lib/supabase";
import {
  ParsedSyllabusSubject,
  SyllabusMetadata,
  parseSyllabusRawText,
  extractTextFromPdfFile,
} from "../lib/syllabusParser";
import { ENGINEERING_YEARS, getEngineeringYearCode } from "../lib/engineeringUtils";

interface SubjectImportProgress {
  current: number;
  total: number;
  code: string;
  name: string;
  phase: "saving_subject" | "saving_assignment";
}

interface SubjectImportResult {
  processed: number;
  created: number;
  updated: number;
  assignmentsCreated: number;
  assignmentsSkipped: number;
}

interface SyllabusImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDepartmentId?: string;
  onImportComplete?: (count: number) => void;
}

export const SyllabusImportModal: React.FC<SyllabusImportModalProps> = ({
  open,
  onOpenChange,
  defaultDepartmentId,
  onImportComplete,
}) => {
  const departments = localDb.departments;
  const teachers = localDb.teachers;

  // 1. Mandatory Year, Semester, and Department selections
  const [selectedYear, setSelectedYear] = useState<number>(4); // Default to BE (4th year)
  const [selectedSemester, setSelectedSemester] = useState<string>("7"); // Default to Sem 7
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    defaultDepartmentId || departments[0]?.id || "",
  );

  // Available semesters for the chosen year
  const yearSemesters = useMemo(() => {
    const yInfo = ENGINEERING_YEARS.find((y) => y.year === selectedYear);
    return yInfo ? yInfo.semesters : [selectedYear * 2 - 1, selectedYear * 2];
  }, [selectedYear]);

  // If user changes year, make sure semester is valid
  useEffect(() => {
    if (selectedSemester !== "all" && !yearSemesters.includes(Number(selectedSemester))) {
      setSelectedSemester(String(yearSemesters[0]));
    }
  }, [yearSemesters, selectedSemester]);

  // 2. Upload and Parsing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<SubjectImportProgress | null>(null);
  const [importResult, setImportResult] = useState<SubjectImportResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [rawUploadedText, setRawUploadedText] = useState<string | null>(null);

  // 3. Current Parsed Subjects for the specific Year & Semester
  const [subjectsList, setSubjectsList] = useState<ParsedSyllabusSubject[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-fetch / filter subjects whenever Year, Semester, or Dept changes
  useEffect(() => {
    if (rawUploadedText) {
      // If user had uploaded a PDF, re-parse for the newly chosen Year/Sem
      const targetSem = selectedSemester === "all" ? "all" : Number(selectedSemester);
      const res = parseSyllabusRawText(rawUploadedText, selectedYear, targetSem, selectedDeptId);
      setSubjectsList(
        res.subjects.map((s) => ({
          ...s,
          department_id: selectedDeptId,
          selected: true,
        })),
      );
    } else {
      setSubjectsList([]);
    }
    setError(null);
  }, [selectedYear, selectedSemester, selectedDeptId, rawUploadedText]);

  // Handle PDF file upload
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setUploadedFileName(file.name);

    try {
      const extractedText = await extractTextFromPdfFile(file);
      setRawUploadedText(extractedText);

      const targetSem = selectedSemester === "all" ? "all" : Number(selectedSemester);
      const result = parseSyllabusRawText(extractedText, selectedYear, targetSem, selectedDeptId);

      setSubjectsList(
        result.subjects.map((s) => ({
          ...s,
          department_id: selectedDeptId,
          selected: true,
        })),
      );
    } catch (err: any) {
      setError(err.message || "Unable to parse syllabus file. Please verify the PDF format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImportSession = () => {
    setImportResult(null);
    setImportProgress(null);
    setUploadedFileName(null);
    setRawUploadedText(null);
    setSubjectsList([]);
    setError(null);
  };

  // Toggle single subject selection
  const handleToggleSelect = (index: number) => {
    setSubjectsList((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s)),
    );
  };

  // Toggle all
  const handleToggleSelectAll = (select: boolean) => {
    setSubjectsList((prev) => prev.map((s) => ({ ...s, selected: select })));
  };

  // Assign faculty inline
  const handleAssignTeacher = (index: number, teacherId: string) => {
    setSubjectsList((prev) =>
      prev.map((s, i) => (i === index ? { ...s, assigned_teacher_id: teacherId } : s)),
    );
  };

  const selectedCount = subjectsList.filter((s) => s.selected).length;
  const totalCredits = subjectsList
    .filter((s) => s.selected)
    .reduce((sum, s) => sum + (s.credits || 0), 0);

  const yearLabel = useMemo(() => {
    const yInfo = ENGINEERING_YEARS.find((y) => y.year === selectedYear);
    return yInfo ? yInfo.fullName : `Year ${selectedYear}`;
  }, [selectedYear]);

  const semLabel =
    selectedSemester === "all"
      ? `Sem ${yearSemesters.join(" & ")}`
      : `Semester ${selectedSemester}`;

  // Execute Import
  const handleExecuteImport = async () => {
    const toImport = subjectsList.filter((subject) => subject.selected);
    if (toImport.length === 0) {
      setError("Please select at least one subject to import.");
      return;
    }
    setIsImporting(true);
    setError(null);
    setImportResult(null);
    const createdSubjectIds: string[] = [];
    const createdAssignmentIds: string[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let assignmentsCreated = 0;
    let assignmentsSkipped = 0;
    try {
      for (let index = 0; index < toImport.length; index += 1) {
        const subject = toImport[index];
        setImportProgress({
          current: index + 1,
          total: toImport.length,
          code: subject.code,
          name: subject.name,
          phase: "saving_subject",
        });
        const departmentId = subject.department_id || selectedDeptId;
        const existing = localDb.subjects.find(
          (candidate) =>
            candidate.code.toLowerCase() === subject.code.toLowerCase() &&
            candidate.department_id === departmentId,
        );
        let subjectId: string;
        let subjectWasCreated = false;
        if (existing) {
          const updated = await localDb.update("subjects", existing.id, {
            name: subject.name,
            semester: subject.semester,
            year: subject.year,
            credits: subject.credits,
          });
          if (!updated) {
            throw new Error(`Unable to update subject ${subject.code}.`);
          }
          subjectId = existing.id;
          updatedCount += 1;
        } else {
          const [created] = await localDb.insert("subjects", [
            {
              code: subject.code,
              name: subject.name,
              department_id: departmentId,
              year: subject.year,
              semester: subject.semester,
              credits: subject.credits,
              created_at: new Date().toISOString(),
            },
          ]);
          if (!created) {
            throw new Error(`Unable to create subject ${subject.code}.`);
          }
          subjectId = created.id;
          subjectWasCreated = true;
          createdSubjectIds.push(subjectId);
          createdCount += 1;
        }

        if (subject.assigned_teacher_id) {
          setImportProgress({
            current: index + 1,
            total: toImport.length,
            code: subject.code,
            name: subject.name,
            phase: "saving_assignment",
          });
          const alreadyMapped = localDb.teacher_subjects.some(
            (assignment) =>
              assignment.teacher_id === subject.assigned_teacher_id &&
              assignment.subject_id === subjectId,
          );
          if (alreadyMapped) {
            assignmentsSkipped += 1;
          } else {
            try {
              const [assignment] = await localDb.insert("teacher_subjects", [
                {
                  teacher_id: subject.assigned_teacher_id,
                  subject_id: subjectId,
                  year: subject.year,
                  semester: subject.semester,
                  created_at: new Date().toISOString(),
                },
              ]);
              if (!assignment) {
                throw new Error("Faculty assignment was not created.");
              }
              createdAssignmentIds.push(assignment.id);
              assignmentsCreated += 1;
            } catch (assignmentError) {
              if (subjectWasCreated) {
                await localDb.delete("subjects", subjectId);
                createdSubjectIds.splice(createdSubjectIds.indexOf(subjectId), 1);
                createdCount -= 1;
              }
              throw assignmentError;
            }
          }
        }
      }

      setImportProgress(null);
      setImportResult({
        processed: toImport.length,
        created: createdCount,
        updated: updatedCount,
        assignmentsCreated,
        assignmentsSkipped,
      });
      onImportComplete?.(toImport.length);
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    } catch (err: any) {
      for (const assignmentId of [...createdAssignmentIds].reverse()) {
        await localDb.delete("teacher_subjects", assignmentId);
      }
      for (const subjectId of [...createdSubjectIds].reverse()) {
        await localDb.delete("subjects", subjectId);
      }
      setError(err.message || "Error importing subjects into database.");
    } finally {
      setImportProgress(null);
      setIsImporting(false);
    }
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
        className="w-[min(1000px,calc(100vw-2rem))] max-w-none max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-background p-0 shadow-2xl"
      >
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border bg-card px-6 py-5 sm:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Import Syllabus & Curriculum
                  <Badge
                    variant="outline"
                    className="text-xs bg-primary/10 text-primary border-primary/30"
                  >
                    {getEngineeringYearCode(selectedYear)} • {semLabel}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select your Engineering Year and Semester, upload your syllabus PDF, and import
                  courses.
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 pr-8 [scrollbar-width:thin] sm:px-8 sm:py-6 sm:pr-10">
          {/* STEP 1: Required Scope Selectors (Year, Semester, Department) */}
          <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <School className="h-3.5 w-3.5 text-primary" /> Step 1: Select Year & Semester
              </span>
              <span className="text-[11px] text-muted-foreground">
                Filtered strictly to target curriculum
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.25fr_1fr_1.15fr]">
              {/* Engineering Year */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Engineering Year *
                </label>
                <Select
                  value={String(selectedYear)}
                  onChange={(e) => {
                    const yr = Number(e.target.value);
                    setSelectedYear(yr);
                    // Set default semester for new year
                    setSelectedSemester(String(yr * 2 - 1));
                  }}
                  options={ENGINEERING_YEARS.map((y) => ({
                    value: String(y.year),
                    label: `${y.name} (${y.code})`,
                  }))}
                />
              </div>

              {/* Semester within Year */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Semester *
                </label>
                <Select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  options={[
                    ...yearSemesters.map((s) => ({
                      value: String(s),
                      label: `Semester ${s}`,
                    })),
                    {
                      value: "all",
                      label: `Both Semesters (${yearSemesters.join(" & ")})`,
                    },
                  ]}
                />
              </div>

              {/* Department */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Department
                </label>
                <Select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                />
              </div>
            </div>
          </div>

          {/* STEP 2: Syllabus PDF Upload */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" /> Step 2: Syllabus Document / PDF
              </span>

              {uploadedFileName ? (
                <button
                  type="button"
                  onClick={resetImportSession}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="h-3 w-3" /> Clear Imported Subjects
                </button>
              ) : null}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />

            {/* Clean, compact drag/drop or click zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-5 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2 text-xs text-primary font-medium py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Extracting subjects for {yearLabel} (
                  {semLabel})...
                </div>
              ) : uploadedFileName ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground py-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    PDF Loaded: <span className="text-primary underline">{uploadedFileName}</span>
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    (Click to change file)
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground">
                    <Upload className="h-4 w-4 text-primary" />
                    <span>Upload Syllabus PDF (.pdf or .txt)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Auto-extracts course codes, titles, and credits for{" "}
                    {getEngineeringYearCode(selectedYear)} {semLabel}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                        {importProgress.phase === "saving_assignment"
                          ? "Creating faculty assignment"
                          : `Saving subject ${importProgress.current} of ${importProgress.total}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {importProgress.code} • {importProgress.name}
                      </p>
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
                        The Subjects page has been updated. Review the result, then select Done.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-5">
                    <div className="rounded-lg border bg-card p-2">
                      <p className="text-lg font-bold">{importResult.processed}</p>
                      <p>Processed</p>
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <p className="text-lg font-bold">{importResult.created}</p>
                      <p>Created</p>
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <p className="text-lg font-bold">{importResult.updated}</p>
                      <p>Updated</p>
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <p className="text-lg font-bold">{importResult.assignmentsCreated}</p>
                      <p>Assignments</p>
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <p className="text-lg font-bold">{importResult.assignmentsSkipped}</p>
                      <p>Unchanged</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* STEP 3: Subjects List for the Selected Year & Semester */}
          {!importResult && (
            <div className="space-y-2">
              <div className="flex flex-col gap-3 text-xs sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <span className="block font-bold text-foreground">
                    Subjects for {yearLabel} • {semLabel}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {subjectsList.length} subject
                    {subjectsList.length === 1 ? "" : "s"} found
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-muted-foreground hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Streamlined Subjects Cards / List */}
              <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card">
                {subjectsList.length === 0 ? (
                  <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-6 text-center text-xs text-muted-foreground">
                    Upload a syllabus to view subjects for this semester.
                  </div>
                ) : (
                  subjectsList.map((subject, idx) => (
                    <div
                      key={`${subject.code}-${idx}`}
                      className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        subject.selected ? "bg-primary/5" : "opacity-65 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={!!subject.selected}
                          onCheckedChange={() => handleToggleSelect(idx)}
                          aria-label={`Select ${subject.code} ${subject.name}`}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded border border-border">
                              {subject.code}
                            </span>
                            <span className="font-semibold text-xs text-foreground">
                              {subject.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              Sem {subject.semester}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              {subject.credits} Credits
                            </Badge>
                            <span className="capitalize">{subject.category} Course</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Faculty Assignment */}
                      <div className="sm:w-56 shrink-0">
                        <Select
                          value={subject.assigned_teacher_id || ""}
                          onChange={(e) => handleAssignTeacher(idx, e.target.value)}
                          options={[
                            { value: "", label: "Assign Faculty (Optional)" },
                            ...teachers.map((t) => ({
                              value: t.id,
                              label: `${t.full_name} (${t.designation || "Faculty"})`,
                            })),
                          ]}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Summary & Big Import Action */}
        <div className="shrink-0 border-t border-border bg-background px-6 py-4 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-foreground">
                {selectedCount} of {subjectsList.length} subjects selected
              </p>
              <p className="text-muted-foreground">
                {totalCredits} total credits • {getEngineeringYearCode(selectedYear)} • {semLabel}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isImporting}
              >
                Cancel
              </Button>
              {importResult ? (
                <Button
                  size="sm"
                  onClick={() => {
                    resetImportSession();
                    onOpenChange(false);
                  }}
                >
                  Done
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={selectedCount === 0 || isImporting}
                  className="font-semibold shadow-sm disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70"
                >
                  {isImporting ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-4 w-4" />
                  )}
                  {isImporting ? "Persisting subjects..." : `Import ${selectedCount} Subjects`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
