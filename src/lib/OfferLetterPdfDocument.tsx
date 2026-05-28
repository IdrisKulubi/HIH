import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ContractTemplateVariables } from "@/lib/contract-template-types";

const styles = StyleSheet.create({
    page: {
        padding: 48,
        fontSize: 11,
        fontFamily: "Helvetica",
        lineHeight: 1.5,
        color: "#111",
    },
    title: {
        fontSize: 18,
        fontFamily: "Helvetica-Bold",
        marginBottom: 8,
        color: "#1a5c2a",
    },
    subtitle: {
        fontSize: 10,
        color: "#444",
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: "Helvetica-Bold",
        marginTop: 14,
        marginBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        paddingBottom: 4,
    },
    row: {
        flexDirection: "row",
        marginBottom: 4,
    },
    label: {
        width: 160,
        fontFamily: "Helvetica-Bold",
        color: "#374151",
    },
    value: {
        flex: 1,
        color: "#111",
    },
    body: {
        marginTop: 8,
        marginBottom: 12,
    },
    signatureBlock: {
        marginTop: 32,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    signatureLine: {
        width: "45%",
        borderTopWidth: 1,
        borderTopColor: "#333",
        paddingTop: 6,
        fontSize: 9,
        color: "#555",
    },
    footer: {
        position: "absolute",
        bottom: 36,
        left: 48,
        right: 48,
        fontSize: 8,
        color: "#666",
        textAlign: "center",
    },
});

export function OfferLetterPdfDocument({ vars }: { vars: ContractTemplateVariables }) {
    const issuedDate = new Date().toLocaleDateString("en-KE", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const showEnterprise =
        vars.enterpriseContribution && vars.enterpriseContribution !== "0"
        && vars.enterpriseContribution !== "0.00";

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.title}>Grant Offer Letter</Text>
                <Text style={styles.subtitle}>
                    BIRE Programme · Hand-in-Hand Kenya · {vars.agreementType}
                </Text>

                <Text style={styles.sectionTitle}>Recipient</Text>
                <View style={styles.row}>
                    <Text style={styles.label}>Enterprise</Text>
                    <Text style={styles.value}>{vars.enterpriseName}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Lead entrepreneur</Text>
                    <Text style={styles.value}>{vars.applicantName}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.value}>{vars.applicantEmail}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>County / location</Text>
                    <Text style={styles.value}>{vars.county}</Text>
                </View>

                <Text style={styles.sectionTitle}>Approved grant terms</Text>
                <Text style={styles.body}>
                    Hand-in-Hand Kenya is pleased to offer a matching grant to the enterprise named above,
                    subject to the financial terms below and programme conditions. This offer is valid for
                    acceptance within fourteen (14) calendar days of the date of this letter.
                </Text>
                <View style={styles.row}>
                    <Text style={styles.label}>Total project amount</Text>
                    <Text style={styles.value}>KES {vars.totalProjectAmount}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>HiH contribution</Text>
                    <Text style={styles.value}>KES {vars.hihContribution}</Text>
                </View>
                {showEnterprise && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Enterprise co-contribution</Text>
                        <Text style={styles.value}>KES {vars.enterpriseContribution}</Text>
                    </View>
                )}

                <Text style={styles.sectionTitle}>Next steps</Text>
                <Text style={styles.body}>
                    Please review this offer letter, sign where indicated, and return the signed copy via
                    your applicant portal. Disbursement will proceed in accordance with the signed agreement
                    and verified milestones.
                </Text>

                <View style={styles.signatureBlock}>
                    <Text style={styles.signatureLine}>For Hand-in-Hand Kenya (authorised signatory)</Text>
                    <Text style={styles.signatureLine}>Enterprise representative (sign & date)</Text>
                </View>

                <Text style={styles.footer}>
                    Issued {issuedDate} · Matching Grant Offer · {vars.enterpriseName}
                </Text>
            </Page>
        </Document>
    );
}
