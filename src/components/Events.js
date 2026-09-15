import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getSupabase } from "../lib/supabase";
import { ensureSupabaseSession, timeAgo } from "../lib/social";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F8FB" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  pageTitle: { fontSize: 28, fontWeight: "800", color: "#172033", marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: "#64748b", maxWidth: 220 },
  createBtn: { backgroundColor: "#208AEF", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  createBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  tabRow: { flexDirection: "row", paddingHorizontal: 20, marginBottom: 14, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3E8F2", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  tabActive: { backgroundColor: "#208AEF", borderColor: "#208AEF" },
  tabIcon: { fontSize: 14 },
  tabText: { fontSize: 13, fontWeight: "600", color: "#5B6B85" },
  tabTextActive: { color: "#FFFFFF" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E9EDF5", padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center" },
  dateBadge: { width: 52, height: 52, borderRadius: 10, backgroundColor: "#E1EEFF", alignItems: "center", justifyContent: "center", marginRight: 12 },
  dateMonth: { fontSize: 10, fontWeight: "700", color: "#208AEF", textTransform: "uppercase" },
  dateDay: { fontSize: 20, fontWeight: "800", color: "#1B2537" },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F1B33", marginBottom: 4 },
  cardMeta: { fontSize: 12, color: "#5B6B85", marginBottom: 4 },
  cardDesc: { fontSize: 12, color: "#7C8AA3", lineHeight: 17, marginBottom: 4 },
  cardTime: { fontSize: 11, color: "#208AEF", fontWeight: "600" },
  cardArrow: { fontSize: 22, color: "#CBD5E1", marginLeft: 8 },
  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 30, alignItems: "center", borderWidth: 1, borderColor: "#E9EDF5", marginHorizontal: 20 },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyText: { fontSize: 14, color: "#5B6B85", textAlign: "center" },
  loadCard: { alignItems: "center", padding: 40 },
  loadText: { marginTop: 10, fontSize: 13, color: "#64748B" },
  offlineCard: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A", borderWidth: 1, borderRadius: 10, padding: 14, marginHorizontal: 20 },
  offlineText: { fontSize: 13, color: "#92400E", fontWeight: "600", textAlign: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject },
  detailPanel: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  detailTitle: { fontSize: 22, fontWeight: "800", color: "#172033", flex: 1, marginRight: 12 },
  closeBtn: { fontSize: 20, color: "#64748B", padding: 4 },
  detailSec: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  detailLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 6, textTransform: "uppercase" },
  detailVal: { fontSize: 15, color: "#1B2537", lineHeight: 22 },
  detailSub: { fontSize: 13, color: "#64748B", marginTop: 4 },
  detailActions: { flexDirection: "row", gap: 10, paddingTop: 4 },
  editBtn: { flex: 1, backgroundColor: "#208AEF", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  editBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  deleteBtn: { flex: 1, backgroundColor: "#FEE2E2", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  deleteBtnText: { color: "#DC2626", fontSize: 14, fontWeight: "700" },
  formPanel: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  formLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 6, textTransform: "uppercase" },
  formInput: { backgroundColor: "#F6F8FB", borderWidth: 1, borderColor: "#E3E8F2", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#1B2537", marginBottom: 14 },
  formTextarea: { minHeight: 90, textAlignVertical: "top" },
  formRow: { flexDirection: "row", gap: 10 },
  formCol: { flex: 1 },
  submitBtn: { backgroundColor: "#208AEF", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 6, marginBottom: 10 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});

export default function Events({ isAdmin = false }) {
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState("upcoming");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [rsvpList, setRsvpList] = useState([]);
  const [hasRsvpd, setHasRsvpd] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formLoc, setFormLoc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const s = await ensureSupabaseSession();
    if (!s) { setOffline(true); setEvents([]); setLoading(false); return; }
    setOffline(false);
    try {
      const now = new Date().toISOString();
      const q = s.supabase.from("events").select("id,title,description,location,starts_at,ends_at,created_at").order("starts_at", { ascending: tab === "upcoming" }).limit(50);
      if (tab === "upcoming") q.gte("starts_at", now); else q.lt("starts_at", now);
      const { data, error } = await q;
      if (error) throw error;
      setEvents(data || []);
    } catch { setEvents([]); } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const checkRsvp = useCallback(async (eid) => {
    const s = await ensureSupabaseSession();
    if (!s) return;
    try { const { data } = await s.supabase.from("event_rsvps").select("id").eq("event_id", eid).eq("user_id", s.userId).maybeSingle(); setHasRsvpd(!!data); }
    catch { setHasRsvpd(false); }
  }, []);

  const loadRsvps = useCallback(async (eid) => {
    const s = await ensureSupabaseSession();
    if (!s) return;
    try { const { data } = await s.supabase.from("event_rsvps").select("id,user_id,profile:profiles!event_rsvps_user_id_fkey(full_name,company_name)").eq("event_id", eid).limit(100); setRsvpList(data || []); }
    catch { setRsvpList([]); }
  }, []);

  const handleRsvp = async (eid) => {
    const s = await ensureSupabaseSession();
    if (!s) return;
    try {
      if (hasRsvpd) { await s.supabase.from("event_rsvps").delete().eq("event_id", eid).eq("user_id", s.userId); setHasRsvpd(false); }
      else { const { error } = await s.supabase.from("event_rsvps").insert({ event_id: eid, user_id: s.userId }); if (!error) setHasRsvpd(true); }
      loadRsvps(eid);
    } catch { Alert.alert("Error", "Could not update RSVP."); }
  };

  const openCreate = () => { setEditingEvent(null); setFormTitle(""); setFormDesc(""); setFormLoc(""); setFormDate(""); setFormTime(""); setFormEnd(""); setShowForm(true); };

  const openEdit = (ev) => {
    setEditingEvent(ev); setFormTitle(ev.title); setFormDesc(ev.description || ""); setFormLoc(ev.location || "");
    const sd = new Date(ev.starts_at); setFormDate(sd.toISOString().split("T")[0]);
    setFormTime(String(sd.getHours()).padStart(2, "0") + ":" + String(sd.getMinutes()).padStart(2, "0"));
    if (ev.ends_at) { const ed = new Date(ev.ends_at); setFormEnd(String(ed.getHours()).padStart(2, "0") + ":" + String(ed.getMinutes()).padStart(2, "0")); } else setFormEnd("");
    setShowForm(true);
  };

  const submitForm = async () => {
    if (!formTitle.trim() || !formDate || !formTime) { Alert.alert("Missing fields", "Title, date, and start time are required."); return; }
    setSubmitting(true);
    const s = await ensureSupabaseSession();
    if (!s) { setSubmitting(false); return; }
    try {
      const sa = new Date(formDate + "T" + formTime + ":00");
      const ea = formEnd ? new Date(formDate + "T" + formEnd + ":00") : null;
      if (isNaN(sa.getTime())) {
        Alert.alert("Invalid date", "Use the format YYYY-MM-DD for the date and HH:MM for the time.");
        return;
      }
      const d = { title: formTitle.trim(), description: formDesc.trim(), location: formLoc.trim(), starts_at: sa.toISOString(), ends_at: ea && !isNaN(ea.getTime()) ? ea.toISOString() : null };
      if (editingEvent) {
        const { error } = await s.supabase.from("events").update(d).eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await s.supabase.from("events").insert({ ...d, created_by: s.userId });
        if (error) throw error;
      }
      setShowForm(false); loadEvents();
    } catch (e) {
      Alert.alert("Could not save event", e?.message || "Please try again.");
    } finally { setSubmitting(false); }
  };

  const deleteEvent = (ev) => {
    Alert.alert("Delete Event", "Delete " + ev.title + "?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const s = await ensureSupabaseSession(); if (!s) return;
        try { await s.supabase.from("events").delete().eq("id", ev.id); setSelectedEvent(null); loadEvents(); }
        catch { Alert.alert("Error", "Could not delete."); }
      }},
    ]);
  };

  const openDetail = async (ev) => { setSelectedEvent(ev); await checkRsvp(ev.id); await loadRsvps(ev.id); };
  const fmtDate = (i) => new Date(i).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const fmtTime = (i) => new Date(i).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Events</Text>
          <Text style={styles.pageSubtitle}>Discover career events and networking opportunities.</Text>
        </View>
        {isAdmin && (<Pressable style={styles.createBtn} onPress={openCreate}><Text style={styles.createBtnText}>New Event</Text></Pressable>)}
      </View>
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {offline ? (
        <View style={styles.offlineCard}><Text style={styles.offlineText}>Events require an active Supabase connection. Please sign in.</Text></View>
      ) : loading ? (
        <View style={styles.loadCard}><ActivityIndicator size="large" color="#208AEF" /><Text style={styles.loadText}>Loading events...</Text></View>
      ) : events.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}><View style={styles.emptyIconDot} /></View>
          <Text style={styles.emptyText}>{tab === "upcoming" ? "No upcoming events. Check back soon." : "No past events yet."}</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {events.map((ev) => (
            <Pressable key={ev.id} style={styles.card} onPress={() => openDetail(ev)}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateMonth}>{new Date(ev.starts_at).toLocaleString("en", { month: "short" })}</Text>
                <Text style={styles.dateDay}>{new Date(ev.starts_at).getDate()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{ev.title}</Text>
                <Text style={styles.cardMeta}>{ev.location || "Online"} - {fmtTime(ev.starts_at)}</Text>
                {ev.description && <Text style={styles.cardDesc} numberOfLines={2}>{ev.description}</Text>}
                <Text style={styles.cardTime}>{new Date(ev.starts_at) < new Date() ? "Ended" : "Starts " + timeAgo(ev.starts_at)}</Text>
              </View>
              <Text style={styles.cardArrow}>{">"}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {selectedEvent && (
        <Modal visible={!!selectedEvent} transparent animationType="slide" onRequestClose={() => setSelectedEvent(null)}>
          <View style={styles.overlay}>
            <Pressable style={styles.overlayBg} onPress={() => setSelectedEvent(null)} />
            <View style={styles.detailPanel}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
                  <Pressable onPress={() => setSelectedEvent(null)}><Text style={styles.closeBtn}>X</Text></Pressable>
                </View>
                <View style={styles.detailSec}><Text style={styles.detailLabel}>Date & Time</Text><Text style={styles.detailVal}>{fmtDate(selectedEvent.starts_at)} at {fmtTime(selectedEvent.starts_at)}</Text>{selectedEvent.ends_at && <Text style={styles.detailSub}>Until {fmtTime(selectedEvent.ends_at)}</Text>}</View>
                <View style={styles.detailSec}><Text style={styles.detailLabel}>Location</Text><Text style={styles.detailVal}>{selectedEvent.location || "Online Event"}</Text></View>
                {selectedEvent.description && <View style={styles.detailSec}><Text style={styles.detailLabel}>Description</Text><Text style={styles.detailVal}>{selectedEvent.description}</Text></View>}
                {isAdmin && (
                  <View style={styles.detailActions}>
                    <Pressable style={styles.editBtn} onPress={() => { setSelectedEvent(null); openEdit(selectedEvent); }}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.deleteBtn} onPress={() => deleteEvent(selectedEvent)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      {showForm && (
        <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
          <View style={styles.overlay}>
            <Pressable style={styles.overlayBg} onPress={() => setShowForm(false)} />
            <View style={styles.formPanel}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>{editingEvent ? "Edit Event" : "New Event"}</Text>
                  <Pressable onPress={() => setShowForm(false)}><Text style={styles.closeBtn}>X</Text></Pressable>
                </View>

                <Text style={styles.formLabel}>Title *</Text>
                <TextInput style={styles.formInput} value={formTitle} onChangeText={setFormTitle} placeholder="e.g. CV & Career Fair" placeholderTextColor="#94a3b8" />

                <Text style={styles.formLabel}>Date *</Text>
                <TextInput style={styles.formInput} value={formDate} onChangeText={setFormDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" autoCapitalize="none" />

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Start time *</Text>
                    <TextInput style={styles.formInput} value={formTime} onChangeText={setFormTime} placeholder="HH:MM" placeholderTextColor="#94a3b8" autoCapitalize="none" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>End time</Text>
                    <TextInput style={styles.formInput} value={formEnd} onChangeText={setFormEnd} placeholder="HH:MM" placeholderTextColor="#94a3b8" autoCapitalize="none" />
                  </View>
                </View>

                <Text style={styles.formLabel}>Location</Text>
                <TextInput style={styles.formInput} value={formLoc} onChangeText={setFormLoc} placeholder="e.g. Richfield Cape Town Campus" placeholderTextColor="#94a3b8" />

                <Text style={styles.formLabel}>Description</Text>
                <TextInput style={[styles.formInput, styles.formTextarea]} value={formDesc} onChangeText={setFormDesc} placeholder="What should students expect?" placeholderTextColor="#94a3b8" multiline numberOfLines={4} />

                <Pressable style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} disabled={submitting} onPress={submitForm}>
                  <Text style={styles.submitBtnText}>{submitting ? "Saving…" : editingEvent ? "Save Changes" : "Publish Event"}</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
