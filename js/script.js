let calendar;
let allData = [];

async function init() {
    try {
        const response = await fetch('data/shoes.json');
        allData = await response.json();
        initCalendar();
        initScheduleFilters();
        
        // 初始化默认视图
        showView('calendar', { target: document.querySelector('[data-view="calendar"]') });

        // 绑定视图切换事件
        document.querySelectorAll('.view-toggle button').forEach(btn => {
            btn.addEventListener('click', function(e) {
                showView(this.dataset.view, e);
            });
        });
    } catch (error) {
        console.error('数据加载失败:', error);
    }
}

function initScheduleFilters() {
    const brandFilter = document.getElementById('brandFilter');
    const seriesFilter = document.getElementById('seriesFilter');

    // 初始化品牌选项
    const brands = [...new Set(allData.map(item => item.brand))];
    brands.forEach(brand => {
        brandFilter.add(new Option(brand, brand));
    });

    // 系列筛选联动
    brandFilter.addEventListener('change', () => {
        const selectedBrand = brandFilter.value;
        seriesFilter.innerHTML = '<option value="">所有系列</option>';

        const filtered = selectedBrand
            ? allData.filter(item => item.brand === selectedBrand)
            : allData;

        [...new Set(filtered.map(item => item.series))].forEach(series => {
            seriesFilter.add(new Option(series, series));
        });

        updateSchedule();
    });

    seriesFilter.addEventListener('change', updateSchedule);
    
    // 初始化筛选器
    setTimeout(() => {
        brandFilter.dispatchEvent(new Event('change'));
    }, 100);
}

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    const mobileOptions = window.matchMedia("(max-width: 768px)").matches ? {
        headerToolbar: {
            left: 'title',
            center: '',
            right: 'today prev,next'
        },
        aspectRatio: 0.8
    } : {
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
        }
    };

    calendar = new FullCalendar.Calendar(calendarEl, {
        ...mobileOptions,
        initialView: 'dayGridMonth',
        events: allData.map(item => ({
            title: item.name,
            start: item.date,
            extendedProps: item,
            className: 'fc-event-custom'
        })),
        eventContent: renderEventContent,
        fixedWeekCount: false,
        timeZone: 'UTC',
        locale: 'zh-cn',
        height: 'auto',
        contentHeight: 'auto',
        expandRows: true,
        buttonText: {
            today: '今天',
            month: '月视图',
            week: '周视图'
        }
    });
    
    calendar.render();
}

function renderEventContent(eventInfo) {
    const element = document.createElement('div');
    element.className = 'event-card';
    element.innerHTML = `
        <img src="${eventInfo.event.extendedProps.image}" 
             alt="${eventInfo.event.title}"
             loading="lazy">
    `;

    element.addEventListener('click', (e) => {
        e.stopPropagation();
        showTooltip(eventInfo, element);
    });

    return { domNodes: [element] };
}

function showTooltip(eventInfo, triggerElement) {
    document.querySelectorAll('.tooltip-card').forEach(t => t.remove());

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-card';
    tooltip.innerHTML = `
        <h3>${eventInfo.event.title}</h3>
        <div class="tooltip-info">
            <p>品牌｜${eventInfo.event.extendedProps.brand}</p>
            <p>系列｜${eventInfo.event.extendedProps.series}</p>
            <p>套装｜${eventInfo.event.extendedProps.pack}</p>
        </div>
    `;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const rect = triggerElement.getBoundingClientRect();

    document.body.appendChild(tooltip);
    
    // 强制重绘确保获取正确尺寸
    tooltip.offsetHeight;

    if (isMobile) {
        // 移动端：居中显示
        const viewportHeight = window.innerHeight;
        const tooltipHeight = tooltip.offsetHeight;
        const topPosition = Math.max(20, (viewportHeight - tooltipHeight) / 2);
        
        tooltip.style.left = '50%';
        tooltip.style.top = `${topPosition}px`;
        tooltip.style.transform = 'translateX(-50%)';
    } else {
        // 桌面端：智能边界检测
        const viewportHeight = window.innerHeight;
        const tooltipHeight = tooltip.offsetHeight;
        const calculatedTop = rect.top + window.scrollY - tooltipHeight - 10;
        const safeTop = Math.max(20, Math.min(calculatedTop, viewportHeight - tooltipHeight - 20));
        
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${safeTop}px`;
    }

    setTimeout(() => tooltip.classList.add('visible'), 10);

    // 关闭逻辑
    const closeHandler = (e) => {
        if (!tooltip.contains(e.target)) {
            tooltip.remove();
            document.removeEventListener('click', closeHandler);
            document.removeEventListener('touchstart', closeHandler);
        }
    };

    // 触摸滑动关闭
    let touchStartY = 0;
    tooltip.addEventListener('touchstart', e => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    tooltip.addEventListener('touchmove', e => {
        const touchEndY = e.touches[0].clientY;
        if (Math.abs(touchEndY - touchStartY) > 50) {
            tooltip.remove();
        }
    }, { passive: true });

    setTimeout(() => {
        document.addEventListener('click', closeHandler);
        document.addEventListener('touchstart', closeHandler);
    }, 50);
}

function updateSchedule() {
    const brand = document.getElementById('brandFilter').value;
    const series = document.getElementById('seriesFilter').value;

    const filteredData = allData.filter(item => {
        return (!brand || item.brand === brand) &&
            (!series || item.series === series);
    });

    const list = document.getElementById('scheduleList');
    list.innerHTML = '';

    filteredData
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="schedule-item">
                    <div class="date">${formatDate(item.date)}</div>
                    <img src="${item.image}" alt="${item.name}" loading="lazy">
                    <div class="info">
                        <h3>${item.name}</h3>
                        <p>${item.pack}</p>
                    </div>
                </div>
            `;
            list.appendChild(li);
        });
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });
}

function showView(viewName, event) {
    event = event || window.event;
    
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });
    
    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    const buttons = document.querySelectorAll('.view-toggle button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeButton = event.target.closest('button');
    if (activeButton) {
        activeButton.classList.add('active');
    }

    if (viewName === 'schedule') {
        document.getElementById('brandFilter').dispatchEvent(new Event('change'));
    }

    if (viewName === 'calendar') {
        calendar.refetchEvents();
    }
}

document.addEventListener('DOMContentLoaded', init);
