# News from ES to RSS feed, v0.1.0

Simple php to query last items indexed to Elasticsearch and return them as RSS feed.

## Dipendenze

Php, Composer, Elasticsearch, Apache2.

## Struttura del progetto

Il progetto usa [Composer](https://getcomposer.org/) per gestire le dipendenze:

* [php-rss-writer](https://github.com/suin/php-rss-writer) - interfaccia di alto livello
per costruire e pubblicare un feed RSS;
* [elasticsearch-php](https://github.com/elastic/elasticsearch-php) - client php
per elasticsearch.

## Flusso dei dati

Quando eseguito da una chiamata http effettua una query su ES degli ultimi
documenti indicizzati, dal più recente al più vecchio. Il numero di documenti
richiesti è personalizzabile mediante parametro GET nell'url (variabile *size*).

Dal risultato della query viene popolato il feed e poi ritornato al client remoto.

## Parametri

* format: [rss|json] (string)
 * rss: formato rss
 * json: formato json
* search: (string)
* location: (string)
* size: (int > 0, default: 25)

