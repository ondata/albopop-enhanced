# This is a simple echo bot using the decorator mechanism.
# It echoes any incoming text messages.
# Author: Sara Borroni <sara.borroni@pangeaformazione.it>

import telebot
import feedparser

API_TOKEN = '238417787:AAHSJSezf5JLxsT01NcarHx6xIgyuK5Jr_A'

bot = telebot.TeleBot(API_TOKEN)

topic = ""
location = ""
without = ""

# Handle '/start' and '/help'
@bot.message_handler(commands=['help', 'start'])
def send_welcome(message):
    chat_id = message.chat.id
    bot.send_message(chat_id, "Ciao! A che argomento sei interessato oggi?")

# Handle all other messages with content_type 'text' (content_types defaults to ['text'])
@bot.message_handler(func=lambda message: True)
def ask_message(message):
    chat_id = message.chat.id
    text = message.text.split()
    print(text)
    s = "+";
    text = s.join(text)
    print(text)
    bot.send_message(chat_id, "Ok, fammi dare un'occhiata..")
    #bot.reply_to(message, message.text)
    bandi = feedParser(text, chat_id)
    if bandi == 0:
        bot.send_message(chat_id, "Mi spiace, non ho trovato niente al riguardo ;(")

def feedParser(text, chat_id):
    site = 'http://dev.dataninja.it/AlboPOP-enhanced/feed/?search=' + text
    print(site)
    feed = feedparser.parse(site)
    bandi = []

    #print('Post found:')
    #print(len(feed.entries))
    for post in feed.entries:
        bandi.append(post)
        tags = post.tags
        terms = []
        for i in range(0, (len(tags)-1)):
            term = tags[i].term
            terms.append(term.lower())
        m = post.published + ' \n ' + post.summary + ' \n ' + str(terms) + ' \n ' + post.link
        bot.send_message(chat_id, m)

    return(len(feed.entries))


bot.polling(none_stop=False, interval=0)

