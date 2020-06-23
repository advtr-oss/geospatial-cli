## geo(1) -- Geolocation database generator

## SYNOPSIS

Very basic info on usage

## Usage

Generate the MongoDB data and Elasticsearch `*.ndjson` at the current dir

```bash
$ geo update --dir .

$ geo update .
```

## Roadmap

- Generate only the required data `--elastic || -E` or `--mongo || -M`
- Separate script to proxy `mongoimport` and `$ curl {elastic_url}/geo/_bulk ...`

> The later could be made into a separate command within geo, would depend on sizing of the cli
