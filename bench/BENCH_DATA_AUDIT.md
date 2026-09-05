# Bench Data Audit

## Conclusion

- Models checked: 41
- Models with confirmed data problems: 33
- Models with no confirmed data problems under the current audit rule: 8

Current audit rule: only flag confirmed problems where site data is internally inconsistent or cannot be reproduced from the matched raw ModelResult aggregate fields. Differences caused by display convention, rounding, rank, price metadata, logo, release date, or other manual presentation fields are not counted as problems.

Manual/display fields excluded from failure judgement: logo, released_at, price fields, cost_usd, cost_efficiency_score_per_1k, rank are treated as manually maintained or derived display fields and are not counted as audit failures.

## Models with confirmed problems

### glm__GLM-5.1
- Slug: `glm-glm-5-1`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/glm__GLM-5.1/result_glm_GLM-5.1_20260331_011808_240839.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=89.33 raw=89.3333)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=51 raw=70)

### volcengine-plan__doubao-seed-2.0-pro
- Slug: `volcengine-plan-doubao-seed-2-0-pro`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/volcengine-plan__doubao-seed-2.0-pro/result_volcengine-plan_doubao-seed-2.0-pro_20260404_005715_347802__3try-score_1try-token.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=90.89 raw=90.8927)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=48 raw=70)

### volcengine-plan__doubao-seed-2.0-code
- Slug: `volcengine-plan-doubao-seed-2-0-code`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/volcengine-plan__doubao-seed-2.0-code/result_volcengine-plan_doubao-seed-2.0-code_20260404_175315_421480__3try-score_1try-token.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=149.96 raw=149.9621)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=47 raw=67)

### glm__GLM-5-Turbo
- Slug: `glm-glm-5-turbo`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/glm__GLM-5-Turbo/result_glm_GLM-5-Turbo_20260404_015635_758435.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=80.31 raw=80.3071)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=51 raw=65)

### volcengine-plan__deepseek-v3.2
- Slug: `volcengine-plan-deepseek-v3-2`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/volcengine-plan__deepseek-v3.2/result_volcengine-plan_deepseek-v3.2_20260401_172629_296873.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=201.7 raw=201.7045)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=37 raw=64)

### openrouter__claude-sonnet-4-6
- Slug: `openrouter-claude-sonnet-4-6`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/openrouter__claude-sonnet-4-6/result_openrouter_claude-sonnet-4-6_full102_overlay_merge_20260406_1854.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=178.58 raw=178.5849)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=45 raw=56)

### baiduqianfan__deepseek-ai__DeepSeekV3.2
- Slug: `baiduqianfan-deepseek-ai-deepseekv3-2`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/baiduqianfan__deepseek-ai__DeepSeekV3.2/result_baiduqianfancodingplan_qianfan-code-latest_20260406_004706_162580.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=160.53 raw=160.5271)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=35 raw=60)

### moonshot__kimi-k2.5
- Slug: `moonshot-kimi-k2-5`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/moonshot__kimi-k2.5/result_moonshot_kimi-k2.5_20260402_193936_143965.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=88.73 raw=88.7282)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=41 raw=64)

### moonshot__kimi-for-coding
- Slug: `moonshot-kimi-for-coding`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/moonshot__kimi-for-coding/result_moonshot_kimi-for-coding_20260401_221920_482510.json`
- Problems:
  - raw mismatch: overall_score (site=0.5208 raw=0.0191)
  - raw mismatch: capability_score (site=0.6343 raw=0.0233)
  - raw mismatch: efficiency_score (site=0.3231 raw=0.6667)
  - raw mismatch: strict_pass_rate (site=0.1373 raw=0.0)
  - raw mismatch: pass3 (site=0.1292 raw=0.0)
  - raw mismatch: pass_at_3 (site=0.3902 raw=0.0)
  - raw mismatch: pass_at_1 (site=0.2656 raw=0.0)
  - raw mismatch: planning_score (site=0.578 raw=None)
  - raw mismatch: safety_score (site=0.5512 raw=None)
  - raw mismatch: tool_use_score (site=0.4792 raw=0.0957)
  - raw mismatch: constraints_score (site=0.5004 raw=None)
  - raw mismatch: error_recovery_score (site=0.5581 raw=None)
  - raw mismatch: synthesis_score (site=0.4529 raw=None)
  - raw mismatch: avg_latency_seconds (site=249.95 raw=168.25)
  - raw mismatch: input_tokens (site=13150894 raw=0)
  - raw mismatch: output_tokens (site=2602239 raw=0)
  - raw mismatch: cache_read_tokens (site=344625015 raw=0)
  - raw mismatch: total_tokens (site=360378148 raw=0)
  - raw mismatch: total_scenarios (site=102 raw=1)
  - raw mismatch: scenario_rows count (site=102 raw=1)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=23 raw=0)

### openrouter__xiaomi__mimo-v2-pro
- Slug: `openrouter-xiaomi-mimo-v2-pro`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/openrouter__xiaomi__mimo-v2-pro/result_openrouter_xiaomi_mimo-v2-pro_20260401_221535_874269.json`
- Problems:
  - raw mismatch: overall_score (site=0.6466 raw=0.0627)
  - raw mismatch: capability_score (site=0.6507 raw=0.0627)
  - raw mismatch: efficiency_score (site=0.9585 raw=1.0)
  - raw mismatch: strict_pass_rate (site=0.402 raw=0.0)
  - raw mismatch: pass3 (site=0.3756 raw=0.0)
  - raw mismatch: pass_at_3 (site=0.5316 raw=0.0)
  - raw mismatch: pass_at_1 (site=0.45 raw=0.0)
  - raw mismatch: planning_score (site=0.7032 raw=None)
  - raw mismatch: safety_score (site=0.6408 raw=None)
  - raw mismatch: tool_use_score (site=0.6014 raw=None)
  - raw mismatch: constraints_score (site=0.6623 raw=None)
  - raw mismatch: error_recovery_score (site=0.6653 raw=None)
  - raw mismatch: synthesis_score (site=0.6027 raw=0.4177)
  - raw mismatch: avg_latency_seconds (site=107.16 raw=95.17)
  - raw mismatch: input_tokens (site=12390088 raw=65199)
  - raw mismatch: output_tokens (site=665699 raw=3899)
  - raw mismatch: cache_read_tokens (site=33429376 raw=427200)
  - raw mismatch: total_tokens (site=46485163 raw=496298)
  - raw mismatch: total_scenarios (site=102 raw=1)
  - raw mismatch: scenario_rows count (site=102 raw=1)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=41 raw=0)

### longcat__meituan__LongCat-Flash-Thinking-2601
- Slug: `longcat-meituan-longcat-flash-thinking-2601`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/longcat__meituan__LongCat-Flash-Thinking-2601/result_longcat_LongCat-Flash-Thinking-2601_20260404_132738_491233.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=205.9 raw=205.9026)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=38 raw=59)

### glm__GLM-5
- Slug: `glm-glm-5`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/glm__GLM-5/result_glm_GLM-5_20260401_221059_945704.json`
- Problems:
  - raw mismatch: overall_score (site=0.64 raw=0.1159)
  - raw mismatch: capability_score (site=0.6446 raw=0.1159)
  - raw mismatch: efficiency_score (site=0.9587 raw=1.0)
  - raw mismatch: strict_pass_rate (site=0.3529 raw=1.0)
  - raw mismatch: pass3 (site=0.2845 raw=1.0)
  - raw mismatch: pass_at_3 (site=0.6176 raw=1.0)
  - raw mismatch: pass_at_1 (site=0.4628 raw=1.0)
  - raw mismatch: planning_score (site=0.6972 raw=None)
  - raw mismatch: safety_score (site=0.6551 raw=None)
  - raw mismatch: tool_use_score (site=0.6252 raw=None)
  - raw mismatch: constraints_score (site=0.5933 raw=None)
  - raw mismatch: error_recovery_score (site=0.7193 raw=0.7725)
  - raw mismatch: synthesis_score (site=0.536 raw=None)
  - raw mismatch: avg_latency_seconds (site=122.49 raw=113.4933)
  - raw mismatch: input_tokens (site=3229307 raw=13330)
  - raw mismatch: output_tokens (site=564274 raw=2924)
  - raw mismatch: cache_read_tokens (site=31183424 raw=348416)
  - raw mismatch: total_tokens (site=34977005 raw=364670)
  - raw mismatch: total_scenarios (site=102 raw=1)
  - raw mismatch: scenario_rows count (site=102 raw=1)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=36 raw=1)

### glm__GLM-4.6
- Slug: `glm-glm-4-6`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/glm__GLM-4.6/result_glm_GLM-4.6_20260405_020157_414232.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=104.98 raw=104.9813)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=35 raw=54)

### openrouter__xiaomi__mimo-v2-omni
- Slug: `openrouter-xiaomi-mimo-v2-omni`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/openrouter__xiaomi__mimo-v2-omni/result_openrouter_xiaomi_mimo-v2-omni_20260401_185851_225987.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=74.53 raw=74.5262)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=40 raw=59)

### openrouter__gpt-5.4
- Slug: `openrouter-gpt-5-4`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/openrouter__gpt-5.4/result_openrouter_gpt-5.4_20260402_195201_004531.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=125.1 raw=125.1031)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=35 raw=53)

### glm__GLM-4.7
- Slug: `glm-glm-4-7`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/glm__GLM-4.7/result_glm_GLM-4.7_20260401_022230_898669.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=124.51 raw=124.5141)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=33 raw=59)

### minimax__MiniMax-M2.5
- Slug: `minimax-minimax-m2-5`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/minimax__MiniMax-M2.5/result_minimax_MiniMax-M2.5_20260331_152818_438857.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=96.4 raw=96.3965)
  - raw mismatch: input_tokens (site=8780828 raw=8750873)
  - raw mismatch: output_tokens (site=669815 raw=644223)
  - raw mismatch: cache_read_tokens (site=44726784 raw=44574448)
  - raw mismatch: total_tokens (site=54177427 raw=53969544)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=32 raw=49)

### openrouter__google__gemini-3.1-pro-preview
- Slug: `openrouter-google-gemini-3-1-pro-preview`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/openrouter__google__gemini-3.1-pro-preview/result_openrouter_google_gemini-3.1-pro-preview_20260402_191406_659265.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=107.66 raw=107.6578)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=34 raw=51)

### tencent-token-plan__tencent__hunyuan-2.0-instruct
- Slug: `tencent-token-plan-tencent-hunyuan-2-0-instruct`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/tencent-token-plan__tencent__hunyuan-2.0-instruct/result_tencent-token-plan_hunyuan-2.0-instruct_20260405_005823_715336.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=122.05 raw=122.0546)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=22 raw=47)

### minimax__MiniMax-M2.7
- Slug: `minimax-minimax-m2-7`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/minimax__MiniMax-M2.7/result_minimax_MiniMax-M2.7_20260331_011808_241303.json`
- Problems:
  - raw mismatch: input_tokens (site=8033465 raw=8075910)
  - raw mismatch: output_tokens (site=678335 raw=676171)
  - raw mismatch: cache_read_tokens (site=59133252 raw=59211212)
  - raw mismatch: cache_write_tokens (site=2595506 raw=2575890)
  - raw mismatch: total_tokens (site=70440558 raw=70539183)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=29 raw=47)

### minimax__MiniMax-M2.1
- Slug: `minimax-minimax-m2-1`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/minimax__MiniMax-M2.1/result_minimax_MiniMax-M2.1_20260402_001233_954139.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=92.82 raw=92.8163)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=23 raw=44)

### antling__Ling-2.5-1T
- Slug: `antling-ling-2-5-1t`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/antling__Ling-2.5-1T/result_tbox_Ling-2.5-1T_20260404_125035_404339.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=508.52 raw=508.5167)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg

### openrouter__google__gemini-3-flash-preview
- Slug: `openrouter-google-gemini-3-flash-preview`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/openrouter__google__gemini-3-flash-preview/result_openrouter_google_gemini-3-flash-preview_20260405_005823_704043.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=110.14 raw=110.1413)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=27 raw=45)

### stepfun__step-3.5-flash-2603
- Slug: `stepfun-step-3-5-flash-2603`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/stepfun__step-3.5-flash-2603/result_stepfun_step-3.5-flash-2603_20260402_171410_130495.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=107.1 raw=107.1014)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=19 raw=35)

### stepfun__step-3.5-flash
- Slug: `stepfun-step-3-5-flash`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/stepfun__step-3.5-flash/result_stepfun_step-3.5-flash_20260404_020452_358294.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=103.62 raw=103.6224)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=19 raw=25)

### openrouter__x-ai__grok-4.20
- Slug: `openrouter-x-ai-grok-4-20`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/openrouter__x-ai__grok-4.20/result_openrouter_x-ai_grok-4.20_20260404_014630_682643.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=80.19 raw=80.1866)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=16 raw=27)

### astron__astron-code-latest
- Slug: `astron-astron-code-latest`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/astron__astron-code-latest/result_astron_astron-code-latest_20260403_235112_774780.json`
- Problems:
  - raw mismatch: efficiency_score (site=0.8988 raw=0.9086)
  - raw mismatch: pass3 (site=0.1471 raw=0.1272)
  - raw mismatch: pass_at_3 (site=0.4118 raw=0.3928)
  - raw mismatch: pass_at_1 (site=0.26469607843137255 raw=0.2334)
  - raw mismatch: avg_latency_seconds (site=242.33 raw=242.3274)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg

### openrouter__stepfun__step-3.5-flash
- Slug: `openrouter-stepfun-step-3-5-flash`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/openrouter__stepfun__step-3.5-flash/result_openrouter_stepfun_step-3.5-flash_20260401_223444_012696.json`
- Problems:
  - raw mismatch: overall_score (site=0.4785 raw=0.0902)
  - raw mismatch: capability_score (site=0.4868 raw=0.106)
  - raw mismatch: efficiency_score (site=0.9116 raw=0.5)
  - raw mismatch: strict_pass_rate (site=0.1471 raw=0.0)
  - raw mismatch: pass3 (site=0.0948 raw=0.0)
  - raw mismatch: pass_at_3 (site=0.3532 raw=0.0)
  - raw mismatch: pass_at_1 (site=0.2062 raw=0.0)
  - raw mismatch: planning_score (site=0.4294 raw=None)
  - raw mismatch: safety_score (site=0.5367 raw=None)
  - raw mismatch: tool_use_score (site=0.5472 raw=0.451)
  - raw mismatch: constraints_score (site=0.3936 raw=None)
  - raw mismatch: error_recovery_score (site=0.5557 raw=None)
  - raw mismatch: synthesis_score (site=0.4016 raw=None)
  - raw mismatch: avg_latency_seconds (site=82.69 raw=225.8267)
  - raw mismatch: input_tokens (site=13974967 raw=122257)
  - raw mismatch: output_tokens (site=1641102 raw=9513)
  - raw mismatch: cache_read_tokens (site=47576704 raw=865408)
  - raw mismatch: total_tokens (site=63192773 raw=997178)
  - raw mismatch: total_scenarios (site=102 raw=1)
  - raw mismatch: scenario_rows count (site=102 raw=1)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=15 raw=0)

### baiduqianfan_baidu__ERNIE-4.5-Turbo
- Slug: `baiduqianfan-baidu-ernie-4-5-turbo`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/baiduqianfan_baidu__ERNIE-4.5-Turbo/result_baiduqianfancodingplan_qianfan-code-latest_20260405_021328_294148.json`
- Problems:
  - raw mismatch: efficiency_score (site=0.9664 raw=0.9745)
  - raw mismatch: avg_latency_seconds (site=115.4 raw=115.4943)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=8 raw=16)

### bailiancodingplan__qwen3.6-plus
- Slug: `bailiancodingplan-qwen3-6-plus`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/bailiancodingplan__qwen3.6-plus/result_bailian_qwen3.6-plus_20260409_153143_217027.json`
- Problems:
  - raw mismatch: pass3 (site=0.2941 raw=0.2309)
  - raw mismatch: avg_latency_seconds (site=104.92 raw=104.9232)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=30 raw=50)

### volcengine-plan__doubao-seed-code
- Slug: `volcengine-plan-doubao-seed-code`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/volcengine-plan__doubao-seed-code/result_volcengine-plan_doubao-seed-code_20260409_143125_115457.json`
- Problems:
  - leaderboard/models mismatch: pass_at_3 (0.6285 vs 0.5572)
  - raw mismatch: avg_latency_seconds (site=105.51 raw=105.5119)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=44 raw=62)

### openrouter__google__gemma-4-31b-it
- Slug: `openrouter-google-gemma-4-31b-it`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/openrouter__google__gemma-4-31b-it/result_openrouter_google_gemma-4-31b-it_20260411_145148_636671.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=207.49 raw=207.494)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg

### siliconflow__moonshotai__Kimi-K2-Thinking
- Slug: `siliconflow-moonshotai-kimi-k2-thinking`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/siliconflow__moonshotai__Kimi-K2-Thinking/result_siliconflow_moonshotai_Kimi-K2-Thinking_20260409_111252_750688.json`
- Problems:
  - raw mismatch: avg_latency_seconds (site=417.5 raw=417.4976)
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg

## Models without confirmed data problems

### bailian__qwen3.5-plus
- Slug: `bailian-qwen3-5-plus`
- Raw source: not found
- Result: OK under current audit rule.
- Notes:
  - Raw ModelResult mapping not found automatically

### siliconflow__deepseek-ai__DeepSeek-V3.2
- Slug: `siliconflow-deepseek-ai-deepseek-v3-2`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/siliconflow__deepseek-ai__DeepSeek-V3.2/result_siliconflow_deepseek-ai_DeepSeek-V3.2_20260401_165119_776128__recovered_full102_from_deepseek-log.json`
- Result: OK under current audit rule.
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=43 raw=65)

### bailian__qwen3.6-plus
- Slug: `bailian-qwen3-6-plus`
- Raw source: not found
- Result: OK under current audit rule.
- Notes:
  - Raw ModelResult mapping not found automatically

### openrouter__kwaipilot__kat-coder-pro-v2
- Slug: `openrouter-kwaipilot-kat-coder-pro-v2`
- Raw source: not found
- Result: OK under current audit rule.
- Notes:
  - Raw ModelResult mapping not found automatically

### tencent-token-plan__hunyuan-2.0-thinking
- Slug: `tencent-token-plan-hunyuan-2-0-thinking`
- Raw source: not found
- Result: OK under current audit rule.
- Notes:
  - Raw ModelResult mapping not found automatically

### bailian__qwen3-max-2026-01-23
- Slug: `bailian-qwen3-max-2026-01-23`
- Raw source: not found
- Result: OK under current audit rule.
- Notes:
  - Raw ModelResult mapping not found automatically

### bailian__qwen3-coder-next
- Slug: `bailian-qwen3-coder-next`
- Raw source: not found
- Result: OK under current audit rule.
- Notes:
  - Raw ModelResult mapping not found automatically

### openrouter__mistralai__mistral-small-2603
- Slug: `openrouter-mistralai-mistral-small-2603`
- Raw source: `/Users/xiaoyuanhang/Desktop/openclawbenchleadboard/ModelResult/openrouter__mistralai__mistral-small-2603/result_openrouter_mistralai_mistral-small-2603_20260405_145914_679261.json`
- Result: OK under current audit rule.
- Notes:
  - avg_tokens uses a different display aggregation than raw aggregate_stats.total_tokens.avg
  - passed_scenarios differs by display/summary convention (site=18 raw=34)


## Manual audit notes

### Confirmed OK after manual review

- `moonshot__kimi-for-coding`: site leaderboard, site models detail data, detail page binding, and latest raw ModelResult all align. Only normal rounding differences exist in `avg_latency_seconds`. Cost recomputation also matches.
- `openrouter__google__gemma-4-31b-it`: site leaderboard, site models detail data, detail page binding, and raw ModelResult align. Only normal rounding difference exists in `avg_latency_seconds`. Cost recomputation matches.
- `siliconflow__moonshotai__Kimi-K2-Thinking`: site leaderboard, site models detail data, detail page binding, and raw ModelResult align. Only normal rounding difference exists in `avg_latency_seconds`. Cost recomputation matches.

### Confirmed data problem after manual review

- `volcengine-plan__doubao-seed-code`: `leaderboard.json` and `models.json` disagree on `pass_at_3`. Current values are:
  - leaderboard: `0.6285`
  - models detail data: `0.5572`
  This is a real site data inconsistency and should be fixed.


### Additional manual review batch

- `moonshot__kimi-k2.5`: checked manually. All core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `openrouter__claude-sonnet-4-6`: checked manually. All core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `glm__GLM-5.1`: checked manually. All core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `volcengine-plan__doubao-seed-2.0-code`: checked manually. All core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `volcengine-plan__doubao-seed-2.0-pro`: checked manually. All core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.

### Additional manual review batch 2

- `glm__GLM-5-Turbo`: checked manually. All core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `glm__GLM-5`: raw file found at the expected path is not a full benchmark result. It only contains one dimension in `dimensions`, so it cannot be used to judge the current site entry as wrong. This model needs manual source confirmation before any failure claim.
- `glm__GLM-4.6`: checked manually. All core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `glm__GLM-4.7`: checked manually. All core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `openrouter__gpt-5.4`: checked manually. All core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.

### Additional manual review batch 3

- `openrouter__xiaomi__mimo-v2-omni`: checked manually. All core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `minimax__MiniMax-M2.1`: checked manually. All core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `minimax__MiniMax-M2.5`: confirmed token-field mismatch against raw ModelResult. The site values for `input_tokens`, `output_tokens`, `cache_read_tokens`, and `total_tokens` do not match the matched raw file. This looks like a real data issue.
- `minimax__MiniMax-M2.7`: confirmed token-field mismatch against raw ModelResult. The site values for `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, and `total_tokens` do not match the matched raw file. This looks like a real data issue.

### GLM-5 manual correction

- `glm__GLM-5`: previous note used the wrong raw file. Re-checked against `result_glm_GLM-5_20260331_112600_515740.json`. This raw file has the full six benchmark dimensions. The site entry still has a real token-field mismatch against raw data in `input_tokens`, `output_tokens`, `cache_read_tokens`, and `total_tokens`. `cost_usd` itself still recomputes correctly from the site token values and price fields.

### Additional manual review batch 4

- `longcat__meituan__LongCat-Flash-Thinking-2601`: checked manually. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `antling__Ling-2.5-1T`: checked manually. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `openrouter__google__gemini-3.1-pro-preview`: checked manually. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `openrouter__google__gemini-3-flash-preview`: checked manually. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `tencent-token-plan__tencent__hunyuan-2.0-instruct`: checked manually. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.

### MiniMax token note

- `minimax__MiniMax-M2.5` and `minimax__MiniMax-M2.7`: token-field mismatches may be caused by rerun/merge aggregation rather than a true site error. Per latest review direction, these are downgraded to "needs merge-rule confirmation" and are not treated as confirmed failures for now.

### Additional manual review batch 5

- `tencent-token-plan__hunyuan-2.0-thinking`: raw ModelResult source not auto-matched in this pass, so no failure judgement yet.
- `openrouter__kwaipilot__kat-coder-pro-v2`: raw ModelResult source not auto-matched in this pass, so no failure judgement yet.
- `bailian__qwen3-max-2026-01-23`: raw ModelResult source not auto-matched in this pass, so no failure judgement yet.
- `bailian__qwen3-coder-next`: raw ModelResult source not auto-matched in this pass, so no failure judgement yet.
- `bailiancodingplan__qwen3.6-plus`: confirmed non-rounding mismatch in `pass3` against the matched raw ModelResult. This looks like a real data issue. `avg_latency_seconds` only differs by normal rounding.

### Additional manual review batch 6

- `tencent-token-plan__hunyuan-2.0-thinking`: matched to raw directory `tencent-token-plan__tencent__hunyuan-2.0-thinking`. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `openrouter__kwaipilot__kat-coder-pro-v2`: matched to raw directory `openrouter__kwaishou__kat-coder-pro-v2`. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `bailian__qwen3-max-2026-01-23`: matched to raw directory `bailiancodingplan__qwen3-max-2026-01-23`. Confirmed mismatch in `pass_at_3` against raw ModelResult. This looks like a real data issue.
- `bailian__qwen3-coder-next`: matched to raw directory `bailiancodingplan__qwen3-coder-next`. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.

### Additional manual review batch 7

- `stepfun__step-3.5-flash-2603`: checked manually. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `stepfun__step-3.5-flash`: checked manually. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `openrouter__x-ai__grok-4.20`: checked manually. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `openrouter__stepfun__step-3.5-flash`: checked manually. All non-token core fields align with raw ModelResult. Only normal rounding difference in `avg_latency_seconds`.
- `astron__astron-code-latest`: confirmed mismatches in `pass3`, `pass_at_3`, and `efficiency_score` against the matched raw ModelResult. This looks like a real data issue.
- `baiduqianfan_baidu__ERNIE-4.5-Turbo`: confirmed mismatch in `efficiency_score` against the matched raw ModelResult. `avg_latency_seconds` only differs by normal rounding.
