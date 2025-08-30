// api/report/router.js
import { query } from '../database/postgreSQL.js';
import { Router } from 'express';
import { Client } from '@notionhq/client';

const router = Router();

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// 노션 연결 테스트
router.get('/test-connection', async (req, res) => {
  try {
    console.log(process.env.NOTION_DATABASE_ID)
    const response = await notion.pages.retrieve({
      page_id: process.env.NOTION_DATABASE_ID,
    });
    
    res.status(200).json({
      success: true,
      message: '노션 연결 성공!',
      pageTitle: response.properties?.title?.title?.[0]?.plain_text || '제목 없음',
      pageId: response.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '노션 연결 실패',
      error: error.message
    });
  }
});

// 노션 페이지에 테스트 글 작성
router.post('/test-write', async (req, res) => {
  const { message = '🤖 테스트 메시지입니다!' } = req.body;
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  
  try {
    const response = await notion.blocks.children.append({
      block_id: process.env.NOTION_DATABASE_ID,
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `🧪 테스트 - ${now}`
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: message
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `작성 시간: ${now}`
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'divider',
          divider: {}
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: '노션에 글 작성 성공!',
      blocksAdded: response.results.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '노션에 글 작성 실패',
      error: error.message
    });
  }
});

// 개선된 AI 리포트 생성
router.post('/generate-ai-report', async (req, res) => {
  const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  
  try {
    console.log('🤖 AI 리포트 생성 시작...');
    
    // 어제 날짜 범위 계산 (KST 기준)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); // 00:00:00
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999); // 23:59:59
    
    console.log('📊 데이터베이스에서 데이터 수집 중...');
    
    // 1. 신규 가입자 수 (어제)
    const newUsersResult = await query(`
      SELECT COUNT(*) as count 
      FROM users.list 
      WHERE created_at >= $1 AND created_at <= $2
    `, [yesterday.toISOString(), yesterdayEnd.toISOString()]);
    
    // 2. 신규 적금통 수 (어제)
    const newBucketsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_challenge = true THEN 1 END) as challenge,
        COUNT(CASE WHEN is_challenge = false THEN 1 END) as normal
      FROM saving_bucket.list 
      WHERE created_at >= $1 AND created_at <= $2
    `, [yesterday.toISOString(), yesterdayEnd.toISOString()]);
    
    // 3. 어제 활동량 (좋아요, 댓글)
    const activityResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM saving_bucket.like 
         WHERE created_at >= $1 AND created_at <= $2) as new_likes,
        (SELECT COUNT(*) FROM saving_bucket.comment 
         WHERE created_at >= $1 AND created_at <= $2) as new_comments
    `, [yesterday.toISOString(), yesterdayEnd.toISOString()]);
    
    // 4. 전체 통계 (현재 시점)
    const totalStatsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users.list) as total_users,
        (SELECT COUNT(*) FROM saving_bucket.list WHERE status = 'in_progress') as active_buckets,
        (SELECT COUNT(*) FROM saving_bucket.list WHERE status = 'success') as total_success,
        (SELECT COUNT(*) FROM saving_bucket.list WHERE status = 'failed') as total_failed,
        (SELECT COUNT(*) FROM saving_bucket.list WHERE is_challenge = true AND status = 'in_progress') as active_challenges,
        (SELECT COUNT(*) FROM saving_bucket.list WHERE is_challenge = true AND status = 'success') as completed_challenges
    `);
    
    // 5. 대학별 통계 (TOP 5)
    const universityStatsResult = await query(`
      SELECT 
        u.name as university_name,
        COUNT(ul.id) as user_count,
        COUNT(sb.id) as bucket_count
      FROM users.university u
      LEFT JOIN users.list ul ON u.id = ul.university_id
      LEFT JOIN saving_bucket.list sb ON ul.id = sb.user_id AND sb.status = 'in_progress'
      GROUP BY u.id, u.name
      ORDER BY user_count DESC, bucket_count DESC
      LIMIT 5
    `);
    
    // 6. 인기 상품 분석 (TOP 5)
    const popularProductsResult = await query(`
      SELECT 
        accountname as product_name,
        accounttypecode as product_type,
        COUNT(*) as usage_count,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
        ROUND(AVG(target_amount)) as avg_target_amount
      FROM saving_bucket.list 
      WHERE accountname IS NOT NULL
      GROUP BY accountname, accounttypecode
      ORDER BY usage_count DESC
      LIMIT 5
    `);
    
    // 7. 성과 지표
    const performanceResult = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_buckets,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success_buckets,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_buckets,
        ROUND(
          COUNT(CASE WHEN status = 'success' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN status IN ('success', 'failed') THEN 1 END), 0), 
          1
        ) as success_rate,
        ROUND(AVG(CASE WHEN status = 'success' THEN target_amount END)) as avg_success_amount
      FROM saving_bucket.list
    `);
    
    // 8. 크론 작업 시뮬레이션 정보 (실제 크론 로그가 없으므로 추정)
    const cronSimulationResult = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'in_progress' AND accountno IS NOT NULL THEN 1 END) as syncable_buckets,
        COUNT(CASE WHEN status = 'in_progress' AND total_payment > 0 AND success_payment > 0 THEN 1 END) as buckets_with_payments,
        COUNT(CASE WHEN status = 'in_progress' AND last_progress_date IS NOT NULL THEN 1 END) as buckets_with_recent_activity
      FROM saving_bucket.list
    `);
    
    // 데이터 정리
    const reportData = {
      date: today,
      yesterday: yesterday.toLocaleDateString('ko-KR'),
      
      // 어제 신규 활동
      dailyActivity: {
        newUsers: parseInt(newUsersResult.rows[0].count),
        newBuckets: {
          total: parseInt(newBucketsResult.rows[0].total),
          challenge: parseInt(newBucketsResult.rows[0].challenge),
          normal: parseInt(newBucketsResult.rows[0].normal)
        },
        engagement: {
          newLikes: parseInt(activityResult.rows[0].new_likes),
          newComments: parseInt(activityResult.rows[0].new_comments)
        }
      },
      
      // 전체 현황
      totalStats: {
        totalUsers: parseInt(totalStatsResult.rows[0].total_users),
        activeBuckets: parseInt(totalStatsResult.rows[0].active_buckets),
        totalSuccess: parseInt(totalStatsResult.rows[0].total_success),
        totalFailed: parseInt(totalStatsResult.rows[0].total_failed),
        activeChallenges: parseInt(totalStatsResult.rows[0].active_challenges),
        completedChallenges: parseInt(totalStatsResult.rows[0].completed_challenges)
      },
      
      // 성과 지표
      performance: {
        successRate: parseFloat(performanceResult.rows[0].success_rate) || 0,
        avgSuccessAmount: parseInt(performanceResult.rows[0].avg_success_amount) || 0,
        activeBuckets: parseInt(performanceResult.rows[0].active_buckets),
        successBuckets: parseInt(performanceResult.rows[0].success_buckets),
        failedBuckets: parseInt(performanceResult.rows[0].failed_buckets)
      },
      
      // 대학별 현황
      topUniversities: universityStatsResult.rows.map(row => ({
        name: row.university_name,
        userCount: parseInt(row.user_count),
        bucketCount: parseInt(row.bucket_count)
      })),
      
      // 인기 상품
      popularProducts: popularProductsResult.rows.map(row => ({
        name: row.product_name,
        type: row.product_type === '3' ? '적금' : '예금',
        usageCount: parseInt(row.usage_count),
        successCount: parseInt(row.success_count),
        avgTargetAmount: parseInt(row.avg_target_amount)
      })),
      
      // 크론 작업 예상 정보
      systemHealth: {
        syncableBuckets: parseInt(cronSimulationResult.rows[0].syncable_buckets),
        bucketsWithPayments: parseInt(cronSimulationResult.rows[0].buckets_with_payments),
        bucketsWithRecentActivity: parseInt(cronSimulationResult.rows[0].buckets_with_recent_activity)
      }
    };
    
    console.log('📋 수집된 데이터:', JSON.stringify(reportData, null, 2));
    
    // OpenAI API 호출
    console.log('🧠 OpenAI API 호출 중...');
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 "적금통 키우기" 게임화된 저축 서비스의 데이터 분석가입니다. 
            매일 서비스 운영 현황을 분석하여 간결하고 통찰력 있는 리포트를 작성합니다.
            
            리포트 작성 가이드라인:
            1. 핵심 지표를 명확히 제시하고 해석
            2. 사용자 성장세와 참여도 분석
            3. 적금통 성공률과 인기 상품 트렌드 파악
            4. 시스템 건강성과 크론 작업 효율성 언급
            5. 개선 제안이나 주목할 만한 인사이트 제공
            6. 긍정적이면서도 객관적인 톤 유지
            
            응답은 마크다운 형식으로 작성해주세요.`
          },
          {
            role: 'user',
            content: `다음은 ${reportData.date} 적금통 키우기 서비스의 종합 운영 데이터입니다:

**📈 어제(${reportData.yesterday}) 신규 활동:**
- 신규 가입자: ${reportData.dailyActivity.newUsers}명
- 신규 적금통: ${reportData.dailyActivity.newBuckets.total}개 (일반 ${reportData.dailyActivity.newBuckets.normal}개, 챌린지 ${reportData.dailyActivity.newBuckets.challenge}개)
- 사용자 참여: 좋아요 ${reportData.dailyActivity.engagement.newLikes}개, 댓글 ${reportData.dailyActivity.engagement.newComments}개

**🏦 전체 서비스 현황:**
- 총 사용자: ${reportData.totalStats.totalUsers}명
- 진행 중인 적금통: ${reportData.totalStats.activeBuckets}개
- 성공한 적금통: ${reportData.totalStats.totalSuccess}개  
- 실패한 적금통: ${reportData.totalStats.totalFailed}개
- 활성 챌린지: ${reportData.totalStats.activeChallenges}개
- 완료된 챌린지: ${reportData.totalStats.completedChallenges}개

**📊 성과 지표:**
- 적금통 성공률: ${reportData.performance.successRate}%
- 평균 성공 금액: ${reportData.performance.avgSuccessAmount?.toLocaleString()}원

**🏫 대학별 현황 TOP 5:**
${reportData.topUniversities.map((univ, i) => 
  `${i+1}. ${univ.name}: 사용자 ${univ.userCount}명, 활성 적금통 ${univ.bucketCount}개`
).join('\n')}

**🔥 인기 상품 TOP 5:**
${reportData.popularProducts.map((product, i) => 
  `${i+1}. ${product.name} (${product.type}): ${product.usageCount}회 이용, 성공 ${product.successCount}회`
).join('\n')}

**⚙️ 시스템 건강성:**
- 동기화 대상 적금통: ${reportData.systemHealth.syncableBuckets}개
- 납입 기록 있는 적금통: ${reportData.systemHealth.bucketsWithPayments}개  
- 최근 활동 있는 적금통: ${reportData.systemHealth.bucketsWithRecentActivity}개

이 데이터를 바탕으로 포괄적인 일일 리포트를 작성해주세요. 제목은 "🐷 적금통 키우기 일일 리포트 - ${reportData.date}" 로 시작해주세요.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      throw new Error(`OpenAI API 호출 실패: ${openaiResponse.status} ${openaiResponse.statusText} - ${errorData}`);
    }
    
    const openaiData = await openaiResponse.json();
    const aiReport = openaiData.choices[0].message.content;
    
    console.log('✅ OpenAI 리포트 생성 완료');
    
    // 마크다운을 노션 블록으로 변환 (개선된 버전)
    const convertMarkdownToNotionBlocks = (markdown) => {
      const lines = markdown.split('\n').filter(line => line.trim());
      const blocks = [];
      
      for (const line of lines) {
        if (line.startsWith('# ')) {
          blocks.push({
            object: 'block',
            type: 'heading_1',
            heading_1: {
              rich_text: [{ type: 'text', text: { content: line.replace('# ', '') } }]
            }
          });
        } else if (line.startsWith('## ')) {
          blocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: line.replace('## ', '') } }]
            }
          });
        } else if (line.startsWith('### ')) {
          blocks.push({
            object: 'block',
            type: 'heading_3',
            heading_3: {
              rich_text: [{ type: 'text', text: { content: line.replace('### ', '') } }]
            }
          });
        } else if (line.startsWith('- ')) {
          blocks.push({
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: [{ type: 'text', text: { content: line.replace('- ', '') } }]
            }
          });
        } else if (line.includes('**') && line.trim()) {
          // 굵은 텍스트가 포함된 문단 처리
          const parts = line.split('**');
          const richText = [];
          
          for (let i = 0; i < parts.length; i++) {
            if (parts[i]) {
              richText.push({
                type: 'text',
                text: { content: parts[i] },
                annotations: { bold: i % 2 === 1 }
              });
            }
          }
          
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: richText }
          });
        } else if (line.trim()) {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: line } }]
            }
          });
        }
      }
      
      return blocks;
    };
    
    // 노션에 새 페이지 생성
    console.log('📝 노션에 새 페이지 생성 중...');
    
    const notionBlocks = [
      // 생성 정보
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{
            type: 'text',
            text: { content: `🤖 AI 생성 리포트 | 생성 시간: ${now}` }
          }],
          icon: { emoji: "🤖" },
          color: 'blue_background'
        }
      },
      // AI 리포트 내용
      ...convertMarkdownToNotionBlocks(aiReport),
      // 구분선
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },
      // 원본 데이터 (접을 수 있는 토글로)
      {
        object: 'block',
        type: 'toggle',
        toggle: {
          rich_text: [{ type: 'text', text: { content: '📊 상세 데이터 및 통계' } }],
          children: [
            {
              object: 'block',
              type: 'code',
              code: {
                language: 'json',
                rich_text: [{ type: 'text', text: { content: JSON.stringify(reportData, null, 2) } }]
              }
            }
          ]
        }
      }
    ];
    
    // 날짜별 새 페이지 생성
    const notionResponse = await notion.pages.create({
      parent: { 
        page_id: process.env.NOTION_DATABASE_ID
      },
      properties: {
        title: {
          title: [{
            text: { content: `📈 일일 리포트 - ${today}` }
          }]
        }
      },
      children: notionBlocks
    });
    
    console.log('✅ 노션 새 페이지 생성 완료');
    
    // 성공 응답
    res.status(200).json({
      success: true,
      message: '개선된 AI 리포트 생성 및 노션 페이지 생성 완료!',
      data: {
        reportDate: today,
        dataCollected: reportData,
        aiReportLength: aiReport.length,
        notionPageUrl: notionResponse.url,
        notionPageId: notionResponse.id,
        insights: {
          totalMetricsCollected: Object.keys(reportData).length,
          newUsersYesterday: reportData.dailyActivity.newUsers,
          successRate: reportData.performance.successRate,
          topUniversity: reportData.topUniversities[0]?.name || 'N/A'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ AI 리포트 생성 실패:', error);
    
    res.status(500).json({
      success: false,
      message: 'AI 리포트 생성 실패',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
export default router;