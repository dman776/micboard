'use strict';

import { Sortable, Plugins } from '@shopify/draggable';

import { micboard } from './app.js';
import { postJSON } from './data.js';

const NET_DEVICE_TYPES = ['axtd', 'ulxd', 'qlxd', 'uhfr', 'p10t'];

function updateEditEntry(slotSelector, data) {
  slotSelector.querySelector('.cfg-ip').value = data.ip;
  slotSelector.querySelector('.cfg-type').value = data.type;
  slotSelector.querySelector('.cfg-channel').value = data.channel;
  console.log(data);
}


function getMaxSlot() {
  let max = 0;
  micboard.config.slots.forEach((e) => {
    if (e.slot > max) {
      max = e.slot;
    }
  });
  return max;
}


function updateSlotID() {
  const configList = document.querySelectorAll('#editor_holder .cfg-row');
  let i = 1;
  configList.forEach((t) => {
    t.querySelector('.slot-number span').innerHTML = 'slot ' + i;
    t.id = 'editslot-' + i;
    i += 1;
  });
}

function dragSetup() {
  const containerSelector = '#discovered_list, #editor_holder';
  const containers = document.querySelectorAll(containerSelector);

  if (containers.length === 0) {
    return false;
  }

  const sortable = new Sortable(containers, {
    draggable: '.cfg-row',
    handle: '.navbar-dark',
    mirror: {
      constrainDimensions: true,
    },
    plugins: [Plugins.ResizeMirror],
  });

  sortable.on('drag:start', () => console.log('drag:start'));
  sortable.on('drag:move', () => console.log('drag:move'));
  sortable.on('sortable:stop', function() {
    setTimeout(updateSlotID, 125);
  });
}

function renderSlotList() {
  const config = micboard.config.slots;
  const slotCount = getMaxSlot() + 4;
  let t;
  for (let i = 1; i <= slotCount; i += 1) {
    t = document.getElementById('config-slot-template').content.cloneNode(true);
    t.querySelector('span').innerHTML = 'slot ' + i;
    t.querySelector('.cfg-row').id = 'editslot-' + i;
    document.getElementById('editor_holder').append(t);
  }

  config.forEach((e) => {
    const slotID = 'editslot-' + e.slot;
    t = document.getElementById(slotID);
    updateEditEntry(t, e);
  });
}

function renderDiscoverdDeviceList() {
  const discovered = micboard.discovered;
  let t;
  discovered.forEach((e) => {
    for (let i = 1; i <= e.channels; i += 1) {
      t = document.getElementById('config-slot-template').content.cloneNode(true);
      e.channel = i;
      updateEditEntry(t, e);
      document.getElementById('discovered_list').append(t);
    }
  });
}

function generateJSONConfig() {
  const slotList = [];
  const configBoard = document.getElementById('editor_holder').getElementsByClassName('cfg-row');

  for (let i = 0; i < configBoard.length; i += 1) {
    const slot = parseInt(configBoard[i].id.replace(/[^\d.]/g, ''), 10);
    if (slot && (slotList.indexOf(slot) === -1)) {
      const output = {};

      output.slot = slot;
      output.type = configBoard[i].querySelector('.cfg-type').value;

      if (NET_DEVICE_TYPES.indexOf(output.type) > -1) {
        output.ip = configBoard[i].querySelector('.cfg-ip').value;
        output.channel = parseInt(configBoard[i].querySelector('.cfg-channel').value, 10);
      }

      if (output.type) {
        slotList.push(output);
      }
    }
  }
  return slotList;
}


export function initConfigEditor() {
  $('#micboard').hide();
  $('.settings').show();

  renderSlotList();
  renderDiscoverdDeviceList();

  dragSetup();

  $('.cfg-type').change(function() {
    const type = $(this).val();
    if (type === 'offline' || type === '') {
      $(this).closest('.cfg-row').find('.cfg-ip').hide()
      $(this).closest('.cfg-row').find('.cfg-channel').hide();
    } else {
      $(this).closest('.cfg-row').find('.cfg-ip').show();
      $(this).closest('.cfg-row').find('.cfg-channel').show();
    }
  }).change();

  $('#save').click(function() {
    console.log(generateJSONConfig());
  });
}
