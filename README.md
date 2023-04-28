# Uniswap V3 Subgraph

This repo contains subgraph logic that can be deployed for multiple compatible networks.

Compatible networks currently include: mainnet, matic, optimism

### Templating

Mustache templating is used to populate network specific constants. These are used for things like contract addresses, USD pricing logic, and conditional backfilling (used by optimism).

### Network Config

Network properties are defined in the [configs](src/networks/configs) folder. To add a new network, create a new config file and fill out the required fields.

### Dev

To populate constants two scripts must be run. In your cli, define the network name and run the mustache scripts to generate both the constants file and the subgraph.yaml file.

Then, run the graph codegen and build to prepare for deployment.

#### Mainnet example

Run the following in your cli:

```
NETWORK=mainnet yarn run prepare-const
NETWORK=mainnet yarn run prepare-yaml
yarn codegen
yarn build
```
