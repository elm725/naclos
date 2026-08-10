import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer, Font } from '@react-pdf/renderer';
import type { DailyClosureRecord, InventoryVarianceFlag } from '@/types';

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'MAD';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { fontSize: 10, color: '#666666', marginTop: 2 },
  badge: { fontSize: 9, padding: 4, borderRadius: 3, backgroundColor: '#1a1a1a', color: '#ffffff' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6, borderBottom: '1pt solid #cccccc', paddingBottom: 3 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  kpiBox: { width: '23%', padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 },
  kpiLabel: { fontSize: 8, color: '#666666', marginBottom: 3 },
  kpiValue: { fontSize: 13, fontWeight: 700 },
  table: { display: 'flex', width: '100%' },
  tr: { flexDirection: 'row', borderBottom: '0.5pt solid #e0e0e0', paddingVertical: 4 },
  trHeader: { flexDirection: 'row', backgroundColor: '#1a1a1a', paddingVertical: 5 },
  thText: { color: '#ffffff', fontSize: 9, fontWeight: 700 },
  tdLabel: { flex: 3 },
  tdValue: { flex: 1, textAlign: 'right' },
  flagBox: { backgroundColor: '#fdecec', borderLeft: '3pt solid #d92d20', padding: 8, marginBottom: 4, borderRadius: 3 },
  flagText: { color: '#a3161a', fontSize: 9.5, fontWeight: 700 },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, fontSize: 8, color: '#999999', textAlign: 'center' },
});

function money(n: number): string {
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY}`;
}

interface DailyReportPdfProps {
  closure: DailyClosureRecord;
  inventoryFlags: InventoryVarianceFlag[];
}

export function DailyReportPdf({ closure, inventoryFlags }: DailyReportPdfProps) {
  return (
    <Document title={`Naclos - Rapport du ${closure.businessDate}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Naclos Operations & Audit Portal</Text>
            <Text style={styles.subtitle}>
              Clôture Journalière — {closure.businessDate} · Responsable: {closure.managerName}
            </Text>
          </View>
          <Text style={styles.badge}>{closure.status.toUpperCase()}</Text>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Revenu Brut</Text>
            <Text style={styles.kpiValue}>{money(closure.grossRevenue)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Dépenses</Text>
            <Text style={styles.kpiValue}>{money(closure.totalExpenses)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Avances Staff</Text>
            <Text style={styles.kpiValue}>{money(closure.totalStaffAdvances)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Cash Net</Text>
            <Text style={styles.kpiValue}>{money(closure.netCash)}</Text>
          </View>
        </View>

        {inventoryFlags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠ Alertes de Stock ({inventoryFlags.length})</Text>
            {inventoryFlags.map((f, i) => (
              <View key={i} style={styles.flagBox}>
                <Text style={styles.flagText}>{f.message}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dépenses du Jour</Text>
          <View style={styles.table}>
            <View style={styles.trHeader}>
              <Text style={[styles.thText, styles.tdLabel]}>Nom</Text>
              <Text style={[styles.thText, styles.tdValue]}>Prix (DH)</Text>
            </View>
            {closure.expenses.map((e, i) => (
              <View key={i} style={styles.tr}>
                <Text style={styles.tdLabel}>{e.label}</Text>
                <Text style={styles.tdValue}>{money(e.amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avances du Personnel</Text>
          <View style={styles.table}>
            <View style={styles.trHeader}>
              <Text style={[styles.thText, styles.tdLabel]}>Employé</Text>
              <Text style={[styles.thText, styles.tdValue]}>Montant (DH)</Text>
            </View>
            {closure.staffAdvances.length === 0 && (
              <View style={styles.tr}><Text style={styles.tdLabel}>Aucune avance enregistrée</Text></View>
            )}
            {closure.staffAdvances.map((a, i) => (
              <View key={i} style={styles.tr}>
                <Text style={styles.tdLabel}>{a.employeeName}</Text>
                <Text style={styles.tdValue}>{money(a.amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          Généré automatiquement par Naclos Operations & Audit Portal · {new Date().toLocaleString('fr-FR')}
        </Text>
      </Page>
    </Document>
  );
}

/** Renders the PDF document to a Buffer, ready to attach to an email. */
export async function generateDailyReportPdfBuffer(
  closure: DailyClosureRecord,
  inventoryFlags: InventoryVarianceFlag[]
): Promise<Buffer> {
  return renderToBuffer(<DailyReportPdf closure={closure} inventoryFlags={inventoryFlags} />);
}
