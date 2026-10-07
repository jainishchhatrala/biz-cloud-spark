import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error — JSX module ported from the original React app
import ErpApp from "@/erp/ErpApp.jsx";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aalidhra Cashew ERP — Operations Console" },
      { name: "description", content: "Clients, quotations, orders, production, dispatch, payments, inventory and job work in one ERP." },
      { property: "og:title", content: "Aalidhra Cashew ERP — Operations Console" },
      { property: "og:description", content: "One connected workspace for sales, factory and dispatch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ErpApp,
});
