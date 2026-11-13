import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Tailwind, Text } from "@react-email/components";
import type { ReactNode } from "react";

/** Shared shell for all fieldwork emails so they match the other BIRE emails. */
export function FieldworkEmailLayout({ preview, eyebrow, title, children }: { preview: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind config={{ theme: { extend: { colors: { brand: { blue: "#0B5FBA", dark: "#1e293b" } } } } }}>
        <Body className="bg-slate-50 font-sans my-auto mx-auto px-2">
          <Container className="border border-solid border-slate-200 rounded-2xl my-[40px] mx-auto max-w-[580px] bg-white overflow-hidden">
            <Section className="bg-brand-blue px-[24px] py-[20px]">
              <Text className="text-[11px] uppercase tracking-widest font-bold text-blue-100 m-0">{eyebrow}</Text>
              <Heading className="text-white text-[22px] font-bold p-0 mt-[6px] mb-0 mx-0">{title}</Heading>
            </Section>
            <Section className="px-[24px] pt-[20px] pb-[8px]">{children}</Section>
            <Hr className="border-slate-200 my-[8px] mx-[24px]" />
            <Text className="text-xs text-slate-400 text-center px-[24px] pb-[16px] m-0">
              BIRE Programme · Field Operations
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
