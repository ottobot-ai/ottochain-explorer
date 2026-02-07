import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client/core";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

// Use relative URLs - works for both HTTP and HTTPS  
const GRAPHQL_HTTP = "/graphql";

const httpLink = new HttpLink({
  uri: GRAPHQL_HTTP,
});

// Build the link - start with just HTTP
let finalLink = httpLink;

// Try to add WebSocket support for subscriptions (won't break if it fails)
if (typeof window !== "undefined") {
  try {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/graphql`;
    
    const wsLink = new GraphQLWsLink(
      createClient({
        url: wsUrl,
        lazy: true,
        retryAttempts: 2,
      })
    );

    finalLink = split(
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
  } catch (e) {
    console.warn("WebSocket setup failed, using HTTP only:", e);
  }
}

export const apolloClient = new ApolloClient({
  link: finalLink,
  cache: new InMemoryCache(),
});
