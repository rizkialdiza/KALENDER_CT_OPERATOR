
const API_URL = "https://script.google.com/macros/s/AKfycbwtUR7A4YuQSRh1Rh7QSzJOujyxkPU2mwMd9nv8s6G48xno91D2wLb96by4A1TWRF_M/exec"; 

let calendar;
const kuotaGlobalDefault = 2; 
let serverData = { listCuti: {}, listKuota: {}, listOperator: {} };

function toIndoFormat(ymd) {
  let p = ymd.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}
function toISOFormat(dmy) {
  let p = dmy.split('/');
  return p[2] + '-' + p[1] + '-' + p[0];
}

document.addEventListener('DOMContentLoaded', function() {
  muatDataDariSheets();
});

function muatDataDariSheets() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('calendar').style.display = 'none';

  fetch(API_URL)
    .then(response => response.json())
    .then(data => {
      serverData = data; 
      document.getElementById('loading').style.display = 'none';
      document.getElementById('calendar').style.display = 'block';
      buatKalender();
    })
    .catch(err => {
      document.getElementById('loading').style.display = 'none';
      Swal.fire('Koneksi Gagal', 'Gagal memuat data: ' + err, 'error');
    });
}

function buatKalender() {
  const calendarEl = document.getElementById('calendar');
  let events = [];
  let isMobile = window.innerWidth < 768;

  for (let tglIndo in serverData.listCuti) {
    let totalCuti = serverData.listCuti[tglIndo].length;
    if (totalCuti > 0) {
      events.push({
        title: totalCuti + " Orang", 
        start: toISOFormat(tglIndo), 
        allDay: true,
        backgroundColor: '#e0f2fe', 
        borderColor: '#bae6fd',
        textColor: '#0369a1'
      });
    }
  }

  if (calendar) { calendar.destroy(); } 

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth', 
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: isMobile ? 'today' : 'today,dayGridMonth,dayGridWeek'
    },
    locale: 'id',
    buttonText: {
      today: 'Hari Ini',
      month: 'Bulan',
      week: 'Minggu'
    },
    contentHeight: 'auto', 
    events: events,
    
    dayCellDidMount: function(info) {
      let dateObj = new Date(info.date.getTime() - (info.date.getTimezoneOffset() * 60000));
      let tglStrISO = dateObj.toISOString().split('T')[0];
      let tglIndo = toIndoFormat(tglStrISO); 
      
      let kuota = serverData.listKuota[tglIndo] !== undefined ? serverData.listKuota[tglIndo] : kuotaGlobalDefault;
      let totalCuti = serverData.listCuti[tglIndo] ? serverData.listCuti[tglIndo].length : 0;
      
      if (totalCuti >= kuota) {
        info.el.classList.add('day-penuh');
      }
    },

    // 1. KETIKA AREA KOSONG PADA TANGGAL DIKLIK
    dateClick: function(info) {
      prosesKlikKalender(info.dateStr); 
    },

    // 2. KETIKA TULISAN "X ORANG" (EVENT) DIKLIK
    eventClick: function(info) {
      // Mengambil tanggal dari event tersebut (mencegah error zona waktu dengan mengambil bagian YYYY-MM-DD saja)
      let tanggalEventISO = info.event.startStr.split('T')[0]; 
      prosesKlikKalender(tanggalEventISO);
    }
  });

  calendar.render();
}

// FUNGSI UTAMA PENANGANAN FORM & LOGIKA (Dipanggil oleh dateClick dan eventClick)
function prosesKlikKalender(tanggalDiklikISO) {
  let tanggalIndo = toIndoFormat(tanggalDiklikISO); 
  
  let selectedDate = new Date(tanggalDiklikISO);
  selectedDate.setHours(0,0,0,0);
  
  let today = new Date();
  today.setHours(0,0,0,0);
  let thresholdDate = new Date(today);
  thresholdDate.setDate(today.getDate() + 2); 

  let kuota = serverData.listKuota[tanggalIndo] !== undefined ? serverData.listKuota[tanggalIndo] : kuotaGlobalDefault;
  let daftarKaryawan = serverData.listCuti[tanggalIndo] || [];
  let totalCuti = daftarKaryawan.length;

  let htmlDaftarCuti = "<div class='text-start border p-3 bg-light rounded-3 mb-3' style='border-color: #e2e8f0 !important;'><span class='badge bg-secondary mb-2 px-2 py-1'>Daftar Cuti Tahunan: " + tanggalIndo + "</span>";
  if (totalCuti === 0) {
    htmlDaftarCuti += "<p class='text-muted small mb-0 fw-light'>Belum ada yang mengambil Cuti Tahunan.</p>";
  } else {
    htmlDaftarCuti += "<ol class='mb-0 ps-3 small fw-medium text-dark'>";
    daftarKaryawan.forEach(k => {
      htmlDaftarCuti += `<li class='mb-1'>${k.nama} <span class='text-muted fw-normal'>(${k.nrp} - ${k.jabatan})</span></li>`;
    });
    htmlDaftarCuti += "</ol>";
  }
  htmlDaftarCuti += "</div>";

  if (selectedDate <= thresholdDate) {
    Swal.fire({
      icon: 'warning',
      title: 'Pengajuan Ditutup',
      html: `<div class='alert alert-warning p-2 small fw-semibold mb-3' style='text-align: left;'>Maaf Cuti Tahunan hanya dapat diambil H-3 dari tanggal pelaksanaannya Cuti Tahunan</div>` + htmlDaftarCuti,
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#64748b'
    });
  } 
  else if (totalCuti >= kuota) {
    Swal.fire({
      icon: 'error',
      title: 'Kuota Tidak Tersedia',
      html: `<p class='small text-danger fw-medium mb-3'>Batas maksimal Cuti Tahunan untuk tanggal <strong>${tanggalIndo}</strong> adalah <strong>${kuota} orang</strong>.</p>` + htmlDaftarCuti,
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#64748b'
    });
  } 
  else {
    Swal.fire({
      title: 'Pengajuan Cuti Tahunan',
      html: `
        <div class='mb-3 text-muted small text-start'>
          <span>Tanggal Terpilih: <strong class="text-primary">${tanggalIndo}</strong></span><br>
          <span>Sisa Slot Kuota: <strong class="text-success">${kuota - totalCuti} Orang</strong></span>
        </div>
        ${htmlDaftarCuti}
        <div class="text-start mb-2">
          <label class="form-label small fw-semibold text-secondary mb-1">NRP Operator</label>
          <input id="swal-nrp" class="form-control form-control-sm" type="number" placeholder="Masukkan NRP untuk auto-fill..." autocomplete="off">
          <div id="nrp-feedback" class="form-text small" style="display:none;"></div>
        </div>
        <div class="text-start mb-2">
          <label class="form-label small fw-semibold text-secondary mb-1">Nama Lengkap</label>
          <input id="swal-nama" class="form-control form-control-sm bg-light" placeholder="Akan terisi otomatis..." readonly>
        </div>
        <div class="text-start mb-2">
          <label class="form-label small fw-semibold text-secondary mb-1">Jabatan</label>
          <input id="swal-jabatan" class="form-control form-control-sm bg-light" placeholder="Akan terisi otomatis..." readonly>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      focusConfirm: false,
      didOpen: () => {
        const inputNrp = document.getElementById('swal-nrp');
        const inputNama = document.getElementById('swal-nama');
        const inputJabatan = document.getElementById('swal-jabatan');
        const feedback = document.getElementById('nrp-feedback');

        inputNrp.addEventListener('input', function() {
          let nrpVal = inputNrp.value.trim();
          let operator = serverData.listOperator[nrpVal];

          if (operator) {
            inputNama.value = operator.nama;
            inputJabatan.value = operator.jabatan;
            feedback.style.display = "block";
            feedback.style.color = "#155724";
            feedback.innerText = "✓ Data Operator Ditemukan";
          } else {
            inputNama.value = "";
            inputJabatan.value = "";
            if(nrpVal.length > 4) {
              feedback.style.display = "block";
              feedback.style.color = "#721c24";
              feedback.innerText = "✗ NRP Tidak Terdaftar di Database Master";
            } else {
              feedback.style.display = "none";
            }
          }
        });
      },
      preConfirm: () => {
        const nama = document.getElementById('swal-nama').value.trim();
        const nrp = document.getElementById('swal-nrp').value.trim();
        const jabatan = document.getElementById('swal-jabatan').value.trim();
        
        if (!nrp) { Swal.showValidationMessage('NRP wajib diisi!'); return false; }
        if (!nama) { Swal.showValidationMessage('Data operator tidak ditemukan, periksa kembali NRP Anda!'); return false; }
        
        if (daftarKaryawan.some(k => stringClean(k.nrp) === stringClean(nrp))) { 
          Swal.showValidationMessage(`NRP ${nrp} sudah terdaftar mengambil Cuti Tahunan pada tanggal ini!`); 
          return false; 
        }
        return { nama: nama, nrp: nrp, jabatan: jabatan };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'Menyimpan data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

        fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({
            tanggal: tanggalIndo, 
            nama: result.value.nama,
            nrp: result.value.nrp,
            jabatan: result.value.jabatan 
          })
        })
        .then(res => res.json())
        .then(response => {
          if (response.status === 'success') {
            Swal.fire('Tersimpan!', response.message, 'success').then(() => { muatDataDariSheets(); });
          } else {
            Swal.fire('Gagal Menyimpan', response.message, 'error');
          }
        })
        .catch(err => { Swal.fire('Kritikal Sistem', 'Gagal terhubung ke server database.', 'error'); });
      }
    });
  }
}

function stringClean(str) { return String(str).replace(/\.0$/, '').trim(); }
window.addEventListener('resize', function() { buatKalender(); });
