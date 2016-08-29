# -*- coding: utf-8 -*-

# This is a simple echo bot using the decorator mechanism.
# It echoes any incoming text messages.
# Author: Sara Borroni <sara.borroni@pangeaformazione.it>
# Contributor: Alessio Cimarelli <jenkin@dataninja.it>

import requests, pickle, time, telebot
from dateutil.parser import parse
from threading import Thread

# Bot's uid
API_TOKEN = '238417787:AAHSJSezf5JLxsT01NcarHx6xIgyuK5Jr_A'
bot = telebot.TeleBot(API_TOKEN)

# Source parameters
search = ""
without = ""
location = ""

# Databases (simple dicts)
try:
    with open("history.pickle") as f:
        history = pickle.load(f)
except:
    history = {}

try:
    with open("subscriptions.pickle") as f:
        subscriptions = pickle.load(f)
except:
    subscriptions = {}

limit = 5
interval = 3600 # Check every hour


def now():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def save(obj,filename):
    with open(filename+".pickle","w") as f:
        pickle.dump(obj,f)


# Handle '/start' and '/help'
@bot.message_handler(commands=['help', 'start'])
def welcome(message):
    chat_id = message.chat.id

    print "[%s] Help requested by %d" % ( now(), chat_id )

    bot.send_message(
        chat_id,
        "\n".join([
            "Ciao! A che argomento sei interessato oggi?",
            "Invia la tua stringa di ricerca dopo il comando /search. Esempio: /search matrimoni",
            "Invia /subscribe per salvare una stringa di ricerca e ricevere le notifiche ogni ora. Esempio: /subscribe matrimoni",
            "Invia /subscription per controllare la ricerca attiva.",
            "Invia /unsubscribe per annullarla.",
            "Tip: se invii solo /subscribe, ti salvo l'ultima ricerca che mi hai mandato!",
            "Warning: /subscribe backend not implemented, yet!"
        ])
    )


# Handle all other messages with content_type 'text' (content_types defaults to ['text'])
#@bot.message_handler(func=lambda message: True)
@bot.message_handler(commands=['search'])
def search(message):

    chat_id = message.chat.id
    text = message.text.replace("/search","").strip()

    print "[%s] Answer to %s request from %d" % ( now(), text, chat_id )

    ask(chat_id, text)


def ask(chat_id, text, verbose = True):

    # Remote feed url
    feed = "http://dev.dataninja.it/AlboPOP-enhanced/feed/"
    if verbose:
        bot.send_message(chat_id, "Ok, fammi dare un'occhiata...")

    # If something goes wrong during fetching...
    try:

        results = fetch(chat_id, feed, { "format": "json", "search": text })

        if not results:

            if verbose:
                bot.send_message(chat_id, "Mi spiace, non ho trovato niente al riguardo ;(")

        else:

            # Send only new documents from the last same search (if exists and texts match)
            # Parse datetime string to datetime class: http://dateutil.readthedocs.io/en/latest/parser.html
            if chat_id in history and text == history[chat_id]['text']:
                docs = [
                    res for res in results
                    if parse(res['@timestamp']) > history[chat_id]['update']
                ]
            else:
                docs = results

            if not docs:

                if verbose:
                    bot.send_message(chat_id, "Mi spiace, non c'è nulla di nuovo :|")

            else:

                send(chat_id, docs[0:limit])

                if verbose:
                    bot.send_message(chat_id, "Ci sono %d documenti nuovi riguardo \"%s\" (te ne ho mandati solo %d) :D" % ( len(docs), text, limit ))

                # Remember only the last search
                history[chat_id] = {
                    "id": chat_id,
                    "text": text,
                    "update": parse(docs[0]['@timestamp'])
                }

                save(history,"history")

    # ... alert the error!
    except:

        error(chat_id)


@bot.message_handler(commands=['subscribe'])
def subscribe(message):

    chat_id = message.chat.id
    text = message.text.replace("/subscribe","").strip()

    print "[%s] Subscribe %d to %s" % ( now(), chat_id, text )

    # With search string, ask before subscription
    if text:
        ask(chat_id, text)

    if chat_id in history:

        subscriptions[chat_id] = history[chat_id]
        bot.send_message(chat_id, u"Ottimo, ho salvato la ricerca \"%s\", ti avverto quando c'è qualcosa di nuovo :P" % subscriptions[chat_id]['text'])
        save(subscriptions,"subscriptions")

    else:
        error(chat_id)


@bot.message_handler(commands=['subscription'])
def subscription(message):

    chat_id = message.chat.id

    print "[%s] Send active subscription to %d" % ( now(), chat_id )

    if chat_id in subscriptions:
        bot.send_message(chat_id, u"In questo momento hai la ricerca \"%s\" attiva ;)" % subscriptions[chat_id]['text'])
    else:
        bot.send_message(chat_id, u"Nessuna ricerca attiva :(")


@bot.message_handler(commands=['unsubscribe'])
def unsubscribe(message):

    chat_id = message.chat.id

    print "[%s] Unsubscribe %d" % ( now(), chat_id )

    if chat_id in subscriptions:
        del subscriptions[chat_id]
        save(subscriptions,"subscriptions")

    bot.send_message(chat_id, u"Nessuna ricerca attiva :(")


# Fetch data from remote source, using requests: http://docs.python-requests.org/en/master/
def fetch(chat_id, url, params):

    r = requests.get(url, params = params)

    print "[%s] Fetch %s" % ( now(), r.url )

    return r.json()


def send(chat_id, docs):

    print "[%s] Send %d documents to %d" % ( now(), len(docs), chat_id )

    for doc in docs:
        bot.send_message(
            chat_id,
            "\n".join([ doc['updated'], doc['title'], ", ".join(doc['source']['tags']), doc['link'] ])
        )


def check():

    global subscriptions

    while True:

        print "[%s] Automatic check for %d subscriptions" % ( now(), len(subscriptions) )

        for chat_id in subscriptions:

            ask(chat_id, subscriptions[chat_id]['text'], False)
            subscriptions[chat_id] = history[chat_id]

        save(subscriptions,"subscriptions")
        time.sleep(interval)


def error(chat_id):
    print "[%s] Errore per %d" % ( now(), chat_id )
    bot.send_message(chat_id, "Mi spiace, ho avuto un problema e ora sono confuso :O")


thread = Thread(target=check)
thread.start()

bot.polling(none_stop=False, interval=0)

