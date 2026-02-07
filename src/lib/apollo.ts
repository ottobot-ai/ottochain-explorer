import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client/core";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

// Use relative URLs - works for both HTTP and HTTPS
const GRAPHQL_HTTP = import.meta.env.VITE_GRAPHQL_URL || "/graphql";

// Determine WebSocket URL based on current protocol
const getWsUrl = () => {
  if (typeof window === "undefined") return "ws://localhost:4000/graphql";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/graphql`;
};

const httpLink = new HttpLink({
  uri: GRAPHQL_HTTP,
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: getWsUrl(),
  })
);

// Split link: subscriptions go over WS, everything else over HTTP
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
