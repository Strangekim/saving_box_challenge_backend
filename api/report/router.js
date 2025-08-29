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

// OpenAI API를 통한 리포트 생성 및 노션 업로드
router.post('/generate-ai-report', async (req, res) => {
  const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  
  try {
    console.log('🤖 AI 리포트 생성 시작...');
    
    // 1. DB에서 리포트용 데이터 수집
    console.log('📊 데이터베이스에서 데이터 수집 중...');
    
    // 어제 날짜 계산
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 신규 가입자 수 (어제)
    const newUsersResult = await query(`
      SELECT COUNT(*) as count 
      FROM users.list 
      WHERE DATE(created_at) = $1
    `, [yesterdayStr]);
    
    // 신규 적금통 수 (어제)
    const newBucketsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_challenge = true THEN 1 END) as challenge,
        COUNT(CASE WHEN is_challenge = false THEN 1 END) as normal
      FROM saving_bucket.list 
      WHERE DATE(created_at) = $1
    `, [yesterdayStr]);
    
    // 완료된 적금통 수 (어제)
    const completedBucketsResult = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM saving_bucket.list 
      WHERE status IN ('success', 'failed')
        AND DATE(created_at) <= $1
    `, [yesterdayStr]);
    
    // 전체 통계
    const totalStatsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users.list) as total_users,
        (SELECT COUNT(*) FROM saving_bucket.list WHERE status = 'in_progress') as active_buckets,
        (SELECT COUNT(*) FROM saving_bucket.list WHERE status = 'success') as total_success,
        (SELECT COUNT(*) FROM saving_bucket.list WHERE status = 'failed') as total_failed
    `);
    
    // 좋아요/댓글 활동 (어제)
    const activityResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM saving_bucket.like WHERE DATE(created_at) = $1) as new_likes,
        (SELECT COUNT(*) FROM saving_bucket.comment WHERE DATE(created_at) = $1) as new_comments
    `, [yesterdayStr]);
    
    // 데이터 정리
    const reportData = {
      date: today,
      yesterday: yesterdayStr,
      newUsers: parseInt(newUsersResult.rows[0].count),
      newBuckets: {
        total: parseInt(newBucketsResult.rows[0].total),
        challenge: parseInt(newBucketsResult.rows[0].challenge),
        normal: parseInt(newBucketsResult.rows[0].normal)
      },
      completedBuckets: {
        success: parseInt(completedBucketsResult.rows[0].success),
        failed: parseInt(completedBucketsResult.rows[0].failed)
      },
      totalStats: {
        totalUsers: parseInt(totalStatsResult.rows[0].total_users),
        activeBuckets: parseInt(totalStatsResult.rows[0].active_buckets),
        totalSuccess: parseInt(totalStatsResult.rows[0].total_success),
        totalFailed: parseInt(totalStatsResult.rows[0].total_failed)
      },
      activity: {
        newLikes: parseInt(activityResult.rows[0].new_likes),
        newComments: parseInt(activityResult.rows[0].new_comments)
      }
    };
    
    console.log('📋 수집된 데이터:', reportData);
    
    // 2. OpenAI API 호출
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
            1. 핵심 지표를 명확히 제시
            2. 전일 대비 변화가 있다면 언급
            3. 특이사항이나 주목할 점이 있다면 분석
            4. 개선 필요 사항이 있다면 제안
            5. 긍정적인 톤으로 작성하되 객관적 분석 유지
            
            응답은 마크다운 형식으로 작성해주세요.`
          },
          {
            role: 'user',
            content: `다음은 ${reportData.date} 적금통 키우기 서비스의 운영 데이터입니다:

**어제(${reportData.yesterday}) 신규 활동:**
- 신규 가입자: ${reportData.newUsers}명
- 신규 적금통: ${reportData.newBuckets.total}개 (일반 ${reportData.newBuckets.normal}개, 챌린지 ${reportData.newBuckets.challenge}개)
- 새로운 좋아요: ${reportData.activity.newLikes}개
- 새로운 댓글: ${reportData.activity.newComments}개

**전체 현황:**
- 총 사용자 수: ${reportData.totalStats.totalUsers}명
- 진행 중인 적금통: ${reportData.totalStats.activeBuckets}개
- 성공한 적금통: ${reportData.totalStats.totalSuccess}개
- 실패한 적금통: ${reportData.totalStats.totalFailed}개

이 데이터를 바탕으로 일일 리포트를 작성해주세요. 제목은 "🐷 적금통 키우기 일일 리포트 - ${reportData.date}" 로 시작해주세요.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API 호출 실패: ${openaiResponse.status} ${openaiResponse.statusText}`);
    }
    
    const openaiData = await openaiResponse.json();
    const aiReport = openaiData.choices[0].message.content;
    
    console.log('✅ OpenAI 리포트 생성 완료');
    
    // 3. 마크다운을 노션 블록으로 변환 (간단한 변환)
    const convertMarkdownToNotionBlocks = (markdown) => {
      const lines = markdown.split('\n').filter(line => line.trim());
      const blocks = [];
      
      for (const line of lines) {
        if (line.startsWith('# ')) {
          // H1 제목
          blocks.push({
            object: 'block',
            type: 'heading_1',
            heading_1: {
              rich_text: [{ type: 'text', text: { content: line.replace('# ', '') } }]
            }
          });
        } else if (line.startsWith('## ')) {
          // H2 제목
          blocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: line.replace('## ', '') } }]
            }
          });
        } else if (line.startsWith('### ')) {
          // H3 제목
          blocks.push({
            object: 'block',
            type: 'heading_3',
            heading_3: {
              rich_text: [{ type: 'text', text: { content: line.replace('### ', '') } }]
            }
          });
        } else if (line.startsWith('- ')) {
          // 불릿 리스트
          blocks.push({
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: [{ type: 'text', text: { content: line.replace('- ', '') } }]
            }
          });
        } else if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
          // 굵은 텍스트
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{
                type: 'text',
                text: { content: line.replace(/\*\*/g, '') },
                annotations: { bold: true }
              }]
            }
          });
        } else if (line.trim()) {
          // 일반 문단
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
    
    // 4. 노션에 새 페이지 생성
    console.log('📝 노션에 새 페이지 생성 중...');
    
    const notionBlocks = [
      // 생성 정보
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: `🤖 AI 생성 리포트 | 생성 시간: ${now}` },
            annotations: { italic: true, color: 'gray' }
          }]
        }
      },
      // AI 리포트 내용
      ...convertMarkdownToNotionBlocks(aiReport),
      // 원본 데이터 (접을 수 있는 토글로)
      {
        object: 'block',
        type: 'toggle',
        toggle: {
          rich_text: [{ type: 'text', text: { content: '📊 원본 데이터 보기' } }],
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
    
    // 날짜별 새 페이지 생성 (부모 페이지 하위에)
    const notionResponse = await notion.pages.create({
      parent: { 
        page_id: process.env.NOTION_DATABASE_ID  // 실제로는 페이지 ID가 들어있음
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: `일일 리포트 - ${today}`
              }
            }
          ]
        }
      },
      children: notionBlocks
    });
    
    console.log('✅ 노션 새 페이지 생성 완료');
    
    // 5. 성공 응답
    res.status(200).json({
      success: true,
      message: 'AI 리포트 생성 및 노션 새 페이지 생성 완료!',
      data: {
        reportDate: today,
        dataCollected: reportData,
        aiReportLength: aiReport.length,
        notionPageUrl: notionResponse.url,
        notionPageId: notionResponse.id,
        aiReportPreview: aiReport.substring(0, 200) + '...'
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