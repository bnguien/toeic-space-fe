// Isolated harness for the home page, the navbar and the site map. No real API is contacted.
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { useAuthStore } from "../src/modules/auth";
import { httpClient } from "../src/services/http";
import { LandingPage, Navbar, SiteMapHost } from "../src/modules/landing";

function Shell() {
  return (
    <>
      <Navbar />
      <Outlet />
      <SiteMapHost />
    </>
  );
}

function Elsewhere() {
  const { pathname, search } = useLocation();
  return <p>Route {`${pathname}${search}`}</p>;
}

export function mountHome(role: "User" | null) {
  if (role)
    useAuthStore.setState({
      status: "authenticated",
      accessToken: "synthetic-only",
      user: { id: "learner", role, fullName: "Synthetic Learner", email: "l@example.com" } as never,
    });
  else useAuthStore.setState({ status: "anonymous", accessToken: null, user: null });
  httpClient.defaults.adapter = async (config) => {
    throw new Error(`Unexpected request ${config.url}`);
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  const router = createMemoryRouter(
    [
      {
        element: <Shell />,
        children: [
          { path: "/", element: <LandingPage /> },
          { path: "*", element: <Elsewhere /> },
        ],
      },
    ],
    { initialEntries: ["/"] },
  );
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { client, router, root };
}
