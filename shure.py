import time
import socket
import select
import threading

from receiver import WirelessReceiver
from transmitter import WirelessTransmitter, data_output_queue

WirelessReceivers = []


sample = {}
sample['uhfr'] = []
sample['qlxd'] = ['RF_ANTENNA','RX_RF_LVL','AUDIO_LVL']
sample['ulxd'] = ['RF_ANTENNA','RX_RF_LVL','AUDIO_LVL']
sample['axtd'] = []


def get_receiver_by_ip(ip):
    return next((x for x in WirelessReceivers if x.ip == ip), None)

def check_add_receiver(ip, type):
    rec = get_receiver_by_ip(ip)
    if rec:
        return rec
    else:
        rec = WirelessReceiver(ip,type)
        WirelessReceivers.append(rec)
        return rec


def print_ALL():
    for rx in WirelessReceivers:
        print("RX Type: {} IP: {} Status: {}".format(rx.type, rx.ip, rx.rx_com_status))
        for tx in rx.transmitters:
            print("Channel Name: {} Frequency: {} Slot: {} TX: {} TX State: {}".format(tx.chan_name, tx.frequency, tx.slot, tx.channel, tx.tx_state()))

def watchdog_monitor():
    for rx in (rx for rx in WirelessReceivers if rx.rx_com_status == 'CONNECTED'):
        if (int(time.perf_counter()) - rx.socket_watchdog) > 10:
            print('disconnected from: {}'.format(rx.ip))
            rx.socket_disconnect()

    for rx in (rx for rx in WirelessReceivers if rx.rx_com_status == 'DISCONNECTED'):
        if (int(time.perf_counter()) - rx.socket_watchdog) > 10:
            rx.socket_connect()


def WirelessQueue():
    while True:
        for rx in (rx for rx in WirelessReceivers if rx.rx_com_status == 'CONNECTED'):
            strings = rx.get_query_strings()
            for string in strings:
                rx.writeQueue.put(string)
        time.sleep(10)

def SocketService():
    for rx in WirelessReceivers:
        rx.socket_connect()

    while True:
        watchdog_monitor()
        readrx = [rx for rx in WirelessReceivers if rx.rx_com_status == 'CONNECTED']
        writerx = [rx for rx in readrx if not rx.writeQueue.empty()]

        read_socks,write_socks,error_socks = select.select(readrx, writerx, readrx, .2)

        for rx in read_socks:
            data = rx.f.recv(1024).decode('UTF-8')

            # print("read: {} data: {}".format(rx.ip,data))

            d = '>'
            if rx.type == 'uhfr':
                d = '*'
            data =  [e+d for e in data.split(d) if e]

            for line in data:
                # rx.parse_data(line)
                rx.parse_raw_rx(line)

            rx.socket_watchdog = int(time.perf_counter())

        for rx in write_socks:
            string = rx.writeQueue.get()
            print("write: {} data: {}".format(rx.ip,string))
            # print(string)
            rx.f.sendall(bytearray(string,'UTF-8'))

        for sock in error_socks:
            rx.set_rx_com_status('DISCONNECTED')



def main():
    config('config.ini')
    t1 = threading.Thread(target=WirelessQueue)
    t2 = threading.Thread(target=WirelessListen)

    t1.start()
    t2.start()

    time.sleep(2)
    get_receiver_by_ip('10.231.3.50').enable_metering(.1)
    time.sleep(4)
    get_receiver_by_ip('10.231.3.50').disable_metering()
    while True:
       print_ALL()
       time.sleep(3)

if __name__ == '__main__':
    main()
