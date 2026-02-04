import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client/core';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

// Default to Tailscale IP, can be overridden via env
const GRAPHQL_HTTP = import.meta.env.VITE_GRAPHQL_URL || 'http://100.84.108.107:4000/graphql';
const GRAPHQL_WS = GRAPHQL_HTTP.replace('http', 'ws');

const httpLink = new HttpLink({
  uri: GRAPHQL_HTTP,
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS,
  })
);

// Split link: subscriptions go over WS, everything else over HTTP
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
