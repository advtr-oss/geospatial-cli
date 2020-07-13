## geo(1) -- Geolocation database generator

## SYNOPSIS

Very basic info on usage

## Usage

Generate the MongoDB data and Elasticsearch `*.ndjson` at the current dir

```bash
$ geo generate --dir .

$ geo generate .
```

#### Prefix

##### Tokens

**dir**

The directory passed by either `--dir` or at the end of the command

**service**

This is the mapped `elasticsearch` and `mongodb` value to what they are set in `--map`

> defaults to `['mongodb=database', 'elasticsearch=elastic']`

**file**

This is the file being generated

**date**

The current date, can be modified by passing a smaller token

> tokens: `iso`, `clf`, `web`, with `iso` being the default

## Roadmap

- [X] Generate only the required data `--elastic || -E` or `--mongo || -M`
- [X] Separate script to proxy `mongoimport` and `$ curl {elastic_url}/geo/_bulk ...`
- [ ] Add Travis CI
- [X] Add a `--prefix` so when `--dir` is added it either dumps the code in a `./{mongo|elastic}/*.(nd)?json` or `${prefix}/*`
- [ ] Add a `check` command to see if the data inside our `.advtrc` needs updating, or to do it automatically
