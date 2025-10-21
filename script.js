// 전역 변수
let selectedSchool = {
    name: '',
    code: '',
    officeCode: ''
};

// 오늘 날짜 설정 및 자동 급식 조회
document.addEventListener('DOMContentLoaded', async function() {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    document.getElementById('date').value = dateString;
    
    const currentDateElement = document.getElementById('currentDate');
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    currentDateElement.textContent = today.toLocaleDateString('ko-KR', options);
    
    // 기본 학교 정보 설정 (제공된 학교)
    selectedSchool = {
        name: '서울고등학교',
        code: '9290083',
        officeCode: 'T10'
    };
    
    // 학교 정보 표시
    updateSchoolDisplay();
    
    // 페이지 로드 시 자동으로 오늘의 급식 조회
    searchMeal(dateString);
    
    // 학교 검색 이벤트 리스너 추가
    setupSchoolSearch();
    
    // 날짜 이동 버튼 이벤트 리스너 추가
    setupDateControls();
});

// 폼 제출 처리
document.getElementById('searchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const schoolName = document.getElementById('schoolNameInput').value;
    const date = document.getElementById('date').value;
    
    if (!schoolName.trim()) {
        alert('학교명을 입력해주세요.');
        return;
    }
    
    // 학교 검색 후 급식 조회
    await searchSchoolAndMeal(schoolName, date);
});

// 학교 검색 및 급식 조회 함수
async function searchSchoolAndMeal(schoolName, date) {
    const loading = document.getElementById('loading');
    const mealContent = document.getElementById('mealContent');
    
    loading.style.display = 'block';
    mealContent.innerHTML = '';
    
    try {
        // 1. 학교 검색
        const schoolResponse = await fetch(`https://open.neis.go.kr/hub/schoolInfo?Type=json&pIndex=1&pSize=100&SCHUL_NM=${encodeURIComponent(schoolName)}`);
        const schoolData = await schoolResponse.json();
        
        if (!schoolData.schoolInfo || !schoolData.schoolInfo[1] || !schoolData.schoolInfo[1].row) {
            throw new Error('학교를 찾을 수 없습니다.');
        }
        
        const school = schoolData.schoolInfo[1].row[0];
        selectedSchool = {
            name: school.SCHUL_NM,
            code: school.SD_SCHUL_CODE,
            officeCode: school.ATPT_OFCDC_SC_CODE
        };
        
        // 학교 정보 업데이트
        updateSchoolDisplay();
        
        // 2. 급식 정보 조회
        await searchMeal(date);
        
    } catch (error) {
        loading.style.display = 'none';
        mealContent.innerHTML = `<div class="error">오류가 발생했습니다: ${error.message}</div>`;
    }
}

// 급식 검색 함수
async function searchMeal(date) {
    const loading = document.getElementById('loading');
    const mealContent = document.getElementById('mealContent');
    
    loading.style.display = 'block';
    mealContent.innerHTML = '';
    
    try {
        // 선택된 학교의 급식 정보 조회
        const mealResponse = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=100&ATPT_OFCDC_SC_CODE=${selectedSchool.officeCode}&SD_SCHUL_CODE=${selectedSchool.code}&MLSV_YMD=${date.replace(/-/g, '')}`);
        const mealData = await mealResponse.json();
        
        loading.style.display = 'none';
        
        if (!mealData.mealServiceDietInfo || !mealData.mealServiceDietInfo[1] || !mealData.mealServiceDietInfo[1].row) {
            mealContent.innerHTML = '<div class="no-data">해당 날짜의 급식 정보가 없습니다.</div>';
            return;
        }
        
        const meals = mealData.mealServiceDietInfo[1].row;
        displayMeals(meals);
        
    } catch (error) {
        loading.style.display = 'none';
        mealContent.innerHTML = `<div class="error">오류가 발생했습니다: ${error.message}</div>`;
    }
}

// 급식 정보 표시 함수
function displayMeals(meals) {
    const mealContent = document.getElementById('mealContent');
    
    if (meals.length === 0) {
        mealContent.innerHTML = '<div class="no-data">해당 날짜의 급식 정보가 없습니다.</div>';
        return;
    }
    
    let html = '';
    
    meals.forEach(meal => {
        const menuItems = meal.DDISH_NM.split('<br/>').map(item => item.trim()).filter(item => item);
        
        html += `
            <div class="meal-card">
                <div class="meal-type">${meal.MMEAL_SC_NM}</div>
                <ul class="menu-list">
                    ${menuItems.map(item => `<li class="menu-item">${item}</li>`).join('')}
                </ul>
                <div class="meal-info">
                    <span class="calories">칼로리: ${meal.CAL_INFO || '정보 없음'}</span>
                    <span class="origin">${meal.ORPLC_INFO || ''}</span>
                </div>
            </div>
        `;
    });
    
    mealContent.innerHTML = html;
}

// 학교 정보 표시 업데이트
function updateSchoolDisplay() {
    const schoolNameElement = document.getElementById('schoolName');
    if (schoolNameElement) {
        schoolNameElement.textContent = selectedSchool.name;
    }
    
    // 헤더에 학교 정보 표시
    const header = document.querySelector('.header h1');
    if (header) {
        header.innerHTML = `🍽️ ${selectedSchool.name} 급식`;
    }
}

// 학교 검색 설정
function setupSchoolSearch() {
    const schoolInput = document.getElementById('schoolNameInput');
    const suggestions = document.getElementById('schoolSuggestions');
    let searchTimeout;
    
    schoolInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        if (query.length < 2) {
            suggestions.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchSchools(query);
        }, 300);
    });
    
    // 입력 필드에서 포커스가 벗어나면 자동완성 숨기기
    document.addEventListener('click', function(e) {
        if (!schoolInput.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
}

// 학교 검색 함수
async function searchSchools(query) {
    const suggestions = document.getElementById('schoolSuggestions');
    
    try {
        const response = await fetch(`https://open.neis.go.kr/hub/schoolInfo?Type=json&pIndex=1&pSize=10&SCHUL_NM=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.schoolInfo && data.schoolInfo[1] && data.schoolInfo[1].row) {
            const schools = data.schoolInfo[1].row;
            displaySuggestions(schools);
        } else {
            suggestions.style.display = 'none';
        }
    } catch (error) {
        console.error('학교 검색 오류:', error);
        suggestions.style.display = 'none';
    }
}

// 자동완성 제안 표시
function displaySuggestions(schools) {
    const suggestions = document.getElementById('schoolSuggestions');
    
    if (schools.length === 0) {
        suggestions.style.display = 'none';
        return;
    }
    
    let html = '';
    schools.forEach(school => {
        html += `
            <div class="suggestion-item" data-school='${JSON.stringify({
                name: school.SCHUL_NM,
                code: school.SD_SCHUL_CODE,
                officeCode: school.ATPT_OFCDC_SC_CODE,
                address: school.ATPT_OFCDC_SC_NM + ' ' + school.SCHUL_NM
            })}'>
                <div class="suggestion-school-name">${school.SCHUL_NM}</div>
                <div class="suggestion-school-address">${school.ATPT_OFCDC_SC_NM}</div>
            </div>
        `;
    });
    
    suggestions.innerHTML = html;
    suggestions.style.display = 'block';
    
    // 제안 항목 클릭 이벤트
    suggestions.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const schoolData = JSON.parse(this.dataset.school);
            selectedSchool = {
                name: schoolData.name,
                code: schoolData.code,
                officeCode: schoolData.officeCode
            };
            
            document.getElementById('schoolNameInput').value = schoolData.name;
            suggestions.style.display = 'none';
            updateSchoolDisplay();
        });
    });
}

// 날짜 컨트롤 설정
function setupDateControls() {
    const prevDayBtn = document.getElementById('prevDay');
    const nextDayBtn = document.getElementById('nextDay');
    const dateInput = document.getElementById('date');
    
    // 이전 날 버튼
    prevDayBtn.addEventListener('click', function() {
        const currentDate = new Date(dateInput.value);
        currentDate.setDate(currentDate.getDate() - 1);
        const newDateString = currentDate.toISOString().split('T')[0];
        dateInput.value = newDateString;
        
        // 자동으로 급식 조회
        searchMeal(newDateString);
    });
    
    // 다음 날 버튼
    nextDayBtn.addEventListener('click', function() {
        const currentDate = new Date(dateInput.value);
        currentDate.setDate(currentDate.getDate() + 1);
        const newDateString = currentDate.toISOString().split('T')[0];
        dateInput.value = newDateString;
        
        // 자동으로 급식 조회
        searchMeal(newDateString);
    });
    
    // 날짜 입력 변경 시 자동 조회
    dateInput.addEventListener('change', function() {
        if (this.value) {
            searchMeal(this.value);
        }
    });
}
