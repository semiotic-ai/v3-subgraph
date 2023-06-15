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

### Running the subgraph locally
1. In one terminal go have the `./up.sh` script running from the `graph-node-dev` repo.
```bash
./up.sh -c # -c will clean the local dirs
```

2. In another terminal, run the graph-node in another therminal with this command
```bash
cargo run -- --config  ../../streamingFast/graph-node-dev/config/eth-mainnet-substreams.toml --ipfs "localhost:5001"
```

3. Comment out the graft lines in the subgraph.yaml template file before running step 3
```bash
graft: 
  base: {{graft_id}}
  block: {{graft_block}}
```

4. Codegen, build, create and deploy the subgraph
```bash
pnpm install # to install the dependencies
yarn codegen # to codegen all the files and types
yarn build # this will run graph build under the covers
graph create minimal --node http://127.0.0.1:8020
```

Check your graph version by typing in 
```bash
graph
```

If the version is not something like 0.2*.* or you see errors like this

```bash
  Skip migration: Bump mapping apiVersion from 0.0.1 to 0.0.2 (graph-ts dependency not installed yet)
✔ Apply migrations
✖ Failed to load subgraph from build/subgraph.yaml: Error in build/subgraph.yaml:

  Path: dataSources > 0 > source
  Unexpected key in map: startBlock

  Path: /
  Unexpected key in map: templates
```

Then this means that the version of your `graph-cli` is too recent.

You then need to run with the node_modules' version of the cli by running:

```bash
./node_modules/.bin/graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001  minimal ./subgraph.yaml
```
