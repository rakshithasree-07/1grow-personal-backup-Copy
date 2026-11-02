"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, Calendar, Target, UserCheck, Edit3, MessageSquare, Clock, User, Building2, BookOpen, Activity, PhoneCall, MessageCircle, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Card, CardHeader, CardBody, Badge, Modal, Input, Textarea, Select, Skeleton, DatePicker, Avatar } from "@/components/ui";
import { getLead, updateLead, convertLead, assignLead, getConversionStudents, createFollowup, updateFollowup, deleteFollowup, getFollowups, type Lead, type LeadFollowup, type LeadStatus } from "@/services/leads";
import { useRolePath } from "@/hooks/useRolePrefix";
import { useAuthStore } from "@/store/auth.store";
import { getMessage } from "@/services/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

const statusConfig: Record<string, { label: string; variant: "info" | "brand" | "warning" | "success" | "danger" | "outline"; color: string }> = {
  NEW: { label: "New", variant: "info", color: "bg-info" },
  CONTACTED: { label: "Contacted", variant: "brand", color: "bg-primary" },
  FOLLOWUP: { label: "Follow Up", variant: "warning", color: "bg-warning" },
  INTERESTED: { label: "Interested", variant: "success", color: "bg-success" },
  DEMO_SCHEDULED: { label: "Demo Scheduled", variant: "info", color: "bg-info" },
  CONVERTED: { label: "Converted", variant: "success", color: "bg-success" },
  LOST: { label: "Lost", variant: "danger", color: "bg-danger" },
};

const contactedViaConfig: Record<string, { icon: any; color: string }> = {
  CALL: { icon: Phone, color: "text-success" },
  WHATSAPP: { icon: MessageCircle, color: "text-success" },
  SMS: { icon: MessageSquare, color: "text-info" },
  EMAIL: { icon: Mail, color: "text-info" },
  MEETING: { icon: User, color: "text-primary" },
  DEMO_CLASS: { icon: BookOpen, color: "text-warning" },
  VISIT: { icon: Building2, color: "text-warning" },
};

interface LeadDetailPageProps {
  leadId: string;
}

export function LeadDetailPage({ leadId }: LeadDetailPageProps) {
  const router = useRouter();
  const rolePath = useRolePath();
  const currentUser = useAuthStore((s) => s.user);
  const [lead, setLead] = useState<Lead | null>(null);
  const [followups, setFollowups] = useState<LeadFollowup[]>([]);
  const [loading, setLoading] = useState(true);

  const [followupModal, setFollowupModal] = useState(false);
  const [followupNotes, setFollowupNotes] = useState("");
  const [followupOutcome, setFollowupOutcome] = useState("");
  const [followupContactedVia, setFollowupContactedVia] = useState("");
  const [followupNextDate, setFollowupNextDate] = useState("");
  const [followupSubmitting, setFollowupSubmitting] = useState(false);
  const [editFollowup, setEditFollowup] = useState<LeadFollowup | null>(null);

  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [convertModal, setConvertModal] = useState(false);
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [conversionData, setConversionData] = useState({ studentName: "", studentPhone: "", studentEmail: "", batchId: "" });

  const [assignModal, setAssignModal] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const [convStudentSearch, setConvStudentSearch] = useState("");
  const [convStudents, setConvStudents] = useState<{ id: string; name: string; phone: string; email: string | null }[]>([]);
  const [convStudentSearchSubmitting, setConvStudentSearchSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, followupsRes] = await Promise.all([
        getLead(leadId),
        getFollowups(leadId),
      ]);
      setLead(leadRes.data);
      setFollowups(followupsRes.data ?? []);
    } catch {
      toast.error("Failed to load lead");
      router.push(rolePath("/leads"));
    } finally {
      setLoading(false);
    }
  }, [leadId, router, rolePath]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async () => {
    if (!lead || !newStatus) return;
    try {
      await updateLead(lead.id, { status: newStatus as LeadStatus });
      toast.success("Status updated");
      setStatusModal(false);
      fetchData();
    } catch { toast.error("Failed to update status"); }
  };

  const handleEditFollowup = async () => {
    if (!editFollowup) return;
    setFollowupSubmitting(true);
    try {
      await updateFollowup(editFollowup.id, {
        notes: followupNotes,
        outcome: followupOutcome || undefined,
        contactedVia: followupContactedVia || undefined,
        nextDate: followupNextDate || undefined,
      });
      toast.success("Follow-up updated");
      setEditFollowup(null);
      setFollowupModal(false);
      setFollowupNotes("");
      setFollowupOutcome("");
      setFollowupContactedVia("");
      setFollowupNextDate("");
      fetchData();
    } catch (err) { toast.error(getMessage(err) || "Failed to update follow-up"); }
    finally { setFollowupSubmitting(false); }
  };

  const handleDeleteFollowup = async (followupId: string) => {
    if (!confirm("Delete this follow-up?")) return;
    try {
      await deleteFollowup(followupId);
      toast.success("Follow-up deleted");
      fetchData();
    } catch (err) { toast.error(getMessage(err) || "Failed to delete follow-up"); }
  };

  const handleAddFollowup = async () => {
    if (!followupNotes.trim()) { toast.error("Notes are required"); return; }
    setFollowupSubmitting(true);
    try {
      await createFollowup(leadId, {
        notes: followupNotes,
        outcome: followupOutcome || undefined,
        contactedVia: followupContactedVia || undefined,
        nextDate: followupNextDate || undefined,
      });
      toast.success("Follow-up added");
      setFollowupModal(false);
      setFollowupNotes("");
      setFollowupOutcome("");
      setFollowupContactedVia("");
      setFollowupNextDate("");
      fetchData();
    } catch { toast.error("Failed to add follow-up"); }
    finally { setFollowupSubmitting(false); }
  };

  const handleConvert = async () => {
    if (!conversionData.studentName.trim()) { toast.error("Student name is required"); return; }
    if (conversionData.studentPhone && !/^\d{10}$/.test(conversionData.studentPhone.replace(/\D/g, ""))) {
      toast.error("Student phone must be a valid 10-digit number");
      return;
    }
    if (conversionData.studentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(conversionData.studentEmail)) {
      toast.error("Enter a valid student email address");
      return;
    }
    setConvertSubmitting(true);
    try {
      await convertLead(leadId, conversionData);
      toast.success("Lead converted to student successfully");
      setConvertModal(false);
      fetchData();
    } catch { toast.error("Failed to convert lead"); }
    finally { setConvertSubmitting(false); }
  };

  const handleAssign = async () => {
    if (!lead || !currentUser) return;
    setAssignSubmitting(true);
    try {
      await assignLead(lead.id, currentUser.id);
      toast.success("Lead assigned to you");
      setAssignModal(false);
      fetchData();
    } catch { toast.error("Failed to assign lead"); }
    finally { setAssignSubmitting(false); }
  };

  const handleConvStudentSearch = async (query: string) => {
    setConvStudentSearch(query);
    if (!query.trim()) { setConvStudents([]); return; }
    setConvStudentSearchSubmitting(true);
    try {
      const res = await getConversionStudents({ search: query });
      setConvStudents(res.data?.data ?? []);
    } catch { setConvStudents([]); }
    finally { setConvStudentSearchSubmitting(false); }
  };

  if (loading) {
    return (
      <PageContainer back={() => router.push(rolePath("/leads"))}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-4 w-72 rounded-[var(--radius-sm)]" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2"><Skeleton className="h-[300px] rounded-[var(--radius-md)]" /></div>
            <Skeleton className="h-[300px] rounded-[var(--radius-md)]" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!lead) return null;

  const cfg = statusConfig[lead.status] || { label: lead.status, variant: "outline" as const, color: "bg-text-disabled" };

  return (
    <PageContainer back={() => router.push(rolePath("/leads"))}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start gap-4">
          <Avatar src={null} name={lead.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary">{lead.name}</h1>
              <Badge size="sm" variant={cfg.variant}>{cfg.label}</Badge>
            </div>
            <p className="text-sm text-text-secondary mt-1">{lead.phone}{lead.email ? ` · ${lead.email}` : ""}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-1 px-1">
        <a
          href={`tel:${lead.phone}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-success text-success-foreground font-medium shrink-0 active:scale-95 transition-transform"
        >
          <PhoneCall size={16} /> Call
        </a>
        <a
          href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-success/10 text-success font-medium shrink-0 active:scale-95 transition-transform"
        >
          <MessageCircle size={16} /> WhatsApp
        </a>
        <button
          onClick={() => setFollowupModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-primary/10 text-primary font-medium shrink-0 active:scale-95 transition-transform"
        >
          <MessageSquare size={16} /> Add Follow-up
        </button>
        {lead.status !== "CONVERTED" && lead.status !== "LOST" && (
          <button
            onClick={() => {
              setConversionData({ studentName: lead.name, studentPhone: lead.phone, studentEmail: lead.email ?? "", batchId: "" });
              setConvertModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-primary text-primary-foreground font-medium shrink-0 active:scale-95 transition-transform"
          >
            <UserCheck size={16} /> Convert
          </button>
        )}
      </div>

      {/* Desktop Actions */}
      <div className="hidden sm:flex flex-wrap gap-2 mb-6">
        <Button size="sm" variant="outline" onClick={() => router.push(rolePath(`/leads/${lead.id}/edit`))}>
          <Edit3 size={14} /> Edit
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setNewStatus(lead.status); setStatusModal(true); }}>
          <Target size={14} /> Change Status
        </Button>
      </div>

      {/* Main Layout: Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Follow-up Timeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Follow-up Timeline</h3>
              <Button size="xs" onClick={() => setFollowupModal(true)}>
                <MessageSquare size={14} /> Add Follow-up
              </Button>
            </div>

            {followups.length === 0 ? (
              <Card>
                <CardBody>
                  <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised mb-3">
                      <Activity size={24} className="text-text-disabled" />
                    </div>
                    <p className="text-sm font-medium">No follow-ups yet</p>
                    <p className="text-xs mt-1 mb-4">Add the first follow-up to this lead</p>
                    <Button size="sm" onClick={() => setFollowupModal(true)}>
                      <MessageSquare size={14} /> Add Follow-up
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-3">
                {followups.map((f, idx) => {
                  const viaConfig = f.contactedVia ? contactedViaConfig[f.contactedVia] : null;
                  const ViaIcon = viaConfig?.icon ?? MessageSquare;
                  const isFirst = idx === 0;

                  return (
                    <div key={f.id} className="flex gap-3">
                      {/* Timeline Line */}
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                          isFirst ? "bg-primary text-primary-foreground" : "bg-surface-raised text-text-secondary border border-border"
                        )}>
                          <ViaIcon size={14} />
                        </div>
                        {idx < followups.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-2" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <Card className={cn(isFirst && "border-primary/20")}>
                          <CardBody className="py-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {f.contactedVia && (
                                  <Badge size="sm" variant={isFirst ? "brand" : "outline"}>
                                    {f.contactedVia.replace(/_/g, " ")}
                                  </Badge>
                                )}
                                {isFirst && (
                                  <Badge size="sm" variant="success">Latest</Badge>
                                )}
                                <div className="ml-auto flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditFollowup(f);
                                      setFollowupNotes(f.notes);
                                      setFollowupOutcome(f.outcome ?? "");
                                      setFollowupContactedVia(f.contactedVia ?? "");
                                      setFollowupNextDate(f.nextDate ?? "");
                                      setFollowupModal(true);
                                    }}
                                    className="text-text-secondary hover:text-text-primary transition-colors"
                                    title="Edit"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFollowup(f.id);
                                    }}
                                    className="text-text-secondary hover:text-danger transition-colors"
                                    title="Delete"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                  </button>
                                </div>
                              </div>
                              <span className="text-[10px] text-text-disabled shrink-0">
                                {new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
                                {new Date(f.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>

                            <p className="text-sm text-text-primary">{f.notes}</p>

                            {f.outcome && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">Outcome</span>
                                <span className="text-sm font-medium text-text-primary">{f.outcome}</span>
                              </div>
                            )}

                            {f.nextDate && (
                              <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-[var(--radius-sm)] bg-warning/10 text-warning text-xs font-medium">
                                <Clock size={12} />
                                Next follow-up: {new Date(f.nextDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            )}

                            {f.user && (
                              <p className="text-[10px] text-text-disabled mt-2">
                                by <span className="font-medium">{f.user.name}</span>
                              </p>
                            )}
                          </CardBody>
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lead Info */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-text-primary">Lead Information</h3>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Phone", value: lead.phone, icon: Phone, href: `tel:${lead.phone}` },
                  { label: "Email", value: lead.email || "-", icon: Mail, href: lead.email ? `mailto:${lead.email}` : undefined },
                  { label: "Course Interest", value: lead.course || "-", icon: BookOpen },
                  { label: "Lead Source", value: lead.source.replace(/_/g, " "), icon: Target },
                  { label: "Branch", value: lead.branch?.name || "-", icon: Building2 },
                  { label: "Assigned To", value: lead.assignedTo || "Unassigned", icon: User },
                  { label: "Created", value: new Date(lead.createdAt).toLocaleDateString(), icon: Calendar },
                  { label: "Last Updated", value: new Date(lead.updatedAt).toLocaleDateString(), icon: Calendar },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-[var(--radius-sm)] bg-surface-raised",
                      item.href && "hover:bg-surface-overlay transition-colors cursor-pointer"
                    )}
                    onClick={item.href ? () => window.location.href = item.href! : undefined}
                  >
                    <item.icon size={14} className="text-text-secondary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-medium text-text-primary truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Notes */}
          {lead.notes && (
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-text-primary">Notes</h3>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{lead.notes}</p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          {/* Lead Status */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-text-primary">Lead Status</h3>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="space-y-2">
                {Object.entries(statusConfig).map(([key, c]) => (
                  <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-[var(--radius-sm)] hover:bg-surface-overlay transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", c.color)} />
                      <span className={cn("text-xs", lead.status === key ? "font-semibold text-text-primary" : "text-text-secondary")}>{c.label}</span>
                    </div>
                    {lead.status === key && <Badge size="sm" variant="brand">Current</Badge>}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => { setNewStatus(lead.status); setStatusModal(true); }}>
                <Target size={14} /> Change Status
              </Button>
            </CardBody>
          </Card>

          {/* Next Follow-up */}
          <Card>
            <CardHeader>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Clock size={14} className="text-warning" /> Next Follow-up
              </h3>
            </CardHeader>
            <CardBody className="pt-0">
              {lead.nextFollowUp ? (
                <div className="p-3 rounded-[var(--radius-sm)] bg-warning/10">
                  <p className="text-sm font-medium text-text-primary">
                    {new Date(lead.nextFollowUp).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(lead.nextFollowUp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-text-secondary">No follow-up scheduled</p>
              )}
            </CardBody>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-text-primary">Quick Actions</h3>
            </CardHeader>
            <CardBody className="pt-0 space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setFollowupModal(true)}>
                <MessageSquare size={14} /> Log Follow-up
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => router.push(rolePath(`/leads/${lead.id}/edit`))}>
                <Edit3 size={14} /> Edit Lead
              </Button>
              {lead.status !== "CONVERTED" && lead.status !== "LOST" && (
                <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => {
                  setConversionData({ studentName: lead.name, studentPhone: lead.phone, studentEmail: lead.email ?? "", batchId: "" });
                  setConvertModal(true);
                }}>
                  <UserCheck size={14} /> Convert to Student
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setAssignModal(true)}>
                <User size={14} /> Assign to Me
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Followup Modal */}
      <Modal open={followupModal} onClose={() => { setFollowupModal(false); setEditFollowup(null); }} title={editFollowup ? "Edit Follow-up" : "Add Follow-up"} size="md">
        <div className="space-y-4">
          <Select label="Contacted Via" value={followupContactedVia} onChange={(val) => setFollowupContactedVia(val)} options={[
            { value: "", label: "Select..." },
            { value: "CALL", label: "Call" },
            { value: "WHATSAPP", label: "WhatsApp" },
            { value: "SMS", label: "SMS" },
            { value: "EMAIL", label: "Email" },
            { value: "MEETING", label: "Meeting" },
            { value: "DEMO_CLASS", label: "Demo Class" },
            { value: "VISIT", label: "Visit" },
          ]} />
          <Textarea label="Notes *" value={followupNotes} onChange={(e) => setFollowupNotes(e.target.value)} placeholder="Follow-up notes..." rows={3} />
          <Input label="Outcome" value={followupOutcome} onChange={(e) => setFollowupOutcome(e.target.value)} placeholder="What was the outcome?" />
          <DatePicker label="Next Follow-up Date" value={followupNextDate} onChange={setFollowupNextDate} showTimePicker />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setFollowupModal(false); setEditFollowup(null); }}>Cancel</Button>
            <Button onClick={editFollowup ? handleEditFollowup : handleAddFollowup} loading={followupSubmitting}>{editFollowup ? "Update" : "Save"} Follow-up</Button>
          </div>
        </div>
      </Modal>

      {/* Status Change Modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Change Status" size="sm">
        <div className="space-y-4">
          <Select label="New Status" value={newStatus} onChange={(val) => setNewStatus(val)} options={[
            { value: "NEW", label: "New" },
            { value: "CONTACTED", label: "Contacted" },
            { value: "FOLLOWUP", label: "Follow Up" },
            { value: "INTERESTED", label: "Interested" },
            { value: "DEMO_SCHEDULED", label: "Demo Scheduled" },
            { value: "CONVERTED", label: "Converted" },
            { value: "LOST", label: "Lost" },
          ]} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setStatusModal(false)}>Cancel</Button>
            <Button onClick={handleStatusChange}>Update Status</Button>
          </div>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Lead" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Assign &ldquo;{lead.name}&rdquo; to yourself?</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssign} loading={assignSubmitting}><User size={16} /> Assign to Me</Button>
          </div>
        </div>
      </Modal>

      {/* Conversion Modal */}
      <Modal open={convertModal} onClose={() => { setConvertModal(false); setConvStudentSearch(""); setConvStudents([]); }} title="Convert Lead to Student" size="md">
        <div className="space-y-4">
          <div>
            <Input label="Search Existing Students" value={convStudentSearch} onChange={(e) => handleConvStudentSearch(e.target.value)} placeholder="Type to search students..." />
            {convStudentSearchSubmitting && <p className="text-xs text-text-secondary mt-1">Searching...</p>}
            {convStudents.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {convStudents.map((s) => (
                  <button
                    key={s.id}
                    className="w-full text-left px-3 py-2 rounded-[var(--radius-sm)] bg-surface-raised hover:bg-surface-overlay transition-colors text-sm"
                    onClick={() => {
                      setConversionData({ studentName: s.name, studentPhone: s.phone, studentEmail: s.email ?? "", batchId: conversionData.batchId });
                      setConvStudentSearch(s.name);
                      setConvStudents([]);
                    }}
                  >
                    <span className="font-medium text-text-primary">{s.name}</span>
                    <span className="text-text-secondary ml-2">{s.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input label="Student Name *" value={conversionData.studentName} onChange={(e) => setConversionData((p) => ({ ...p, studentName: e.target.value }))} placeholder="Student name" />
          <Input label="Student Phone" value={conversionData.studentPhone} onChange={(e) => setConversionData((p) => ({ ...p, studentPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit phone" inputMode="tel" maxLength={10} />
          <Input label="Student Email" value={conversionData.studentEmail} onChange={(e) => setConversionData((p) => ({ ...p, studentEmail: e.target.value }))} placeholder="Email" type="email" />
          <Input label="Batch ID (optional)" value={conversionData.batchId} onChange={(e) => setConversionData((p) => ({ ...p, batchId: e.target.value }))} placeholder="Assign to batch" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setConvertModal(false)}>Cancel</Button>
            <Button onClick={handleConvert} loading={convertSubmitting}><UserCheck size={16} /> Convert to Student</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
