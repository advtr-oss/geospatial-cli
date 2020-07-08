## geo(1) -- Geolocation database generator

## SYNOPSIS

Very basic info on usage

## Usage

Generate the MongoDB data and Elasticsearch `*.ndjson` at the current dir

```bash
$ geo generate --dir .

$ geo generate .
```

## Roadmap

- [ ] Generate only the required data `--elastic || -E` or `--mongo || -M`
- [ ] Separate script to proxy `mongoimport` and `$ curl {elastic_url}/geo/_bulk ...`
- [ ] Add Travis CI
- [ ] Add a `--prefix` so when `--dir` is added it either dumps the code in a `./{mongo|elastic}/*.(nd)?json` or `${prefix}/*`
- [ ] Add a `check` command to see if the data inside our `.advtrc` needs updating, or to do it automatically
